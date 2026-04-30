import crypto from 'node:crypto';

import type { EvalLogger } from '../harness/logger';
import { consumeSseStream } from '../clients/sse-client';
import type { CapturedEvent } from '../types';
import type {
	DataTableCreateColumn,
	N8nClient,
	WorkflowCreatePayload,
} from '../clients/n8n-client';
import { extractToolSelection } from './tool-selection';
import { verifyEvalSetupTopology } from './topology-verifier';
import type {
	DatasetRow,
	EvalSetupTopologyCase,
	EvalSetupTopologyCaseResult,
	ToolSelectionResult,
	TopologyFinding,
	TopologyVerifierResult,
} from './types';

const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const CONFIRMATION_MAX_RETRIES = 5;

export interface EvalSetupTopologyRunnerConfig {
	client: N8nClient;
	testCase: EvalSetupTopologyCase;
	logger: EvalLogger;
	timeoutMs?: number;
	keepArtifacts?: boolean;
	projectId?: string;
}

type ConfirmationClient = Pick<N8nClient, 'confirmAction'>;
type SseClient = Pick<N8nClient, 'getEventsUrl' | 'cookie'>;
type ThreadStatusClient = Pick<N8nClient, 'getThreadStatus' | 'confirmAction'>;

export async function delay(ms: number): Promise<void> {
	return await new Promise((resolve) => setTimeout(resolve, ms));
}

export function uniqueName(prefix: string, slug: string): string {
	return `${prefix}-${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

export function inferColumnType(
	rows: DatasetRow[],
	columnName: string,
): DataTableCreateColumn['type'] {
	if (rows.some((row) => typeof row[columnName] === 'number')) {
		return 'number';
	}

	if (rows.some((row) => typeof row[columnName] === 'boolean')) {
		return 'boolean';
	}

	return 'string';
}

export function buildWorkflowCreatePayload(
	testCase: EvalSetupTopologyCase,
	projectId?: string,
): WorkflowCreatePayload {
	const workflow = testCase.workflow;

	return {
		name: uniqueName('eval-setup-topology', testCase.slug),
		nodes: workflow.nodes.map((node) => ({ ...node })),
		connections: workflow.connections,
		...(projectId === undefined ? {} : { projectId }),
		...(workflow.pinData === undefined ? {} : { pinData: workflow.pinData }),
		...(workflow.settings === undefined ? {} : { settings: workflow.settings }),
		...(workflow.staticData === undefined ? {} : { staticData: workflow.staticData }),
		...(workflow.meta === undefined ? {} : { meta: workflow.meta }),
	};
}

export function buildEvalPrompt(input: {
	workflowId: string;
	workflowName: string;
	dataTableId: string;
}): string {
	return [
		`Add evaluations to the existing workflow by id and name: ${input.workflowId} (${input.workflowName}).`,
		`Use the existing populated DataTable id ${input.dataTableId}; do not generate a replacement dataset.`,
		'evaluate each AI agent node independently.',
		'Add the eval topology through the evals flow and eval-setup agent.',
		'The eval branch must enter each target AI node independently through Eval Trigger -> Set shape bridge -> target.',
		'do not route production side-effect nodes during eval runs.',
	].join('\n');
}

export function extractConfirmationRequestId(event: CapturedEvent): string | undefined {
	if (typeof event.data.requestId === 'string') {
		return event.data.requestId;
	}

	const payload = event.data.payload;
	if (isRecord(payload) && typeof payload.requestId === 'string') {
		return payload.requestId;
	}

	return undefined;
}

export function isEvalsProposalConfirmation(event: CapturedEvent): boolean {
	if (event.type !== 'confirmation-request') {
		return false;
	}

	const payload = event.data.payload;
	if (isRecord(payload)) {
		if (payload.toolName === 'evals') {
			return true;
		}

		if (isRecord(payload.evalsPropose)) {
			return true;
		}
	}

	if (event.data.toolName === 'evals') {
		return true;
	}

	return isRecord(event.data.evalsPropose);
}

export function isEvalDataConfirmation(event: CapturedEvent): boolean {
	if (event.type !== 'confirmation-request') {
		return false;
	}

	const payload = event.data.payload;
	if (isRecord(payload) && payload.toolName === 'eval-data') {
		return true;
	}

	return event.data.toolName === 'eval-data';
}

export async function startSseConnection(
	client: SseClient,
	threadId: string,
	events: CapturedEvent[],
	signal: AbortSignal,
): Promise<void> {
	await consumeSseStream(
		client.getEventsUrl(threadId),
		client.cookie,
		(event) => {
			try {
				const data: unknown = JSON.parse(event.data);
				if (!isRecord(data)) {
					return;
				}

				events.push({
					timestamp: Date.now(),
					type: typeof data.type === 'string' ? data.type : (event.type ?? 'unknown'),
					data,
				});
			} catch {
				// SSE can include transient non-JSON payloads; they are not useful for verification.
			}
		},
		signal,
	);
}

export async function approveEvalConfirmations(input: {
	client: ConfirmationClient;
	events: CapturedEvent[];
	approvedRequestIds: Set<string>;
	dataTableId: string;
	logger: EvalLogger;
	retryCounts?: Map<string, number>;
}): Promise<void> {
	for (const event of input.events) {
		if (!isEvalsProposalConfirmation(event) && !isEvalDataConfirmation(event)) {
			continue;
		}

		const requestId = extractConfirmationRequestId(event);
		if (!requestId || input.approvedRequestIds.has(requestId)) {
			continue;
		}

		const retryCounts = input.retryCounts ?? new Map<string, number>();
		const retryCount = retryCounts.get(requestId) ?? 0;
		if (retryCount >= CONFIRMATION_MAX_RETRIES) {
			continue;
		}

		try {
			if (isEvalDataConfirmation(event)) {
				input.logger.verbose(`[auto-approve] Declining eval-data confirmation: ${requestId}`);
				await input.client.confirmAction(requestId, false);
			} else {
				input.logger.verbose(`[auto-approve] Approving confirmation: ${requestId}`);
				await input.client.confirmAction(requestId, true, {
					mockCredentials: true,
					datasetChoice: 'link-existing',
					existingDataTableId: input.dataTableId,
				});
			}
			input.approvedRequestIds.add(requestId);
			retryCounts.delete(requestId);
		} catch (error) {
			retryCounts.set(requestId, retryCount + 1);
			const message = error instanceof Error ? error.message : String(error);
			input.logger.verbose(
				`[auto-approve] Failed to approve ${requestId} (attempt ${String(
					retryCount + 1,
				)}/${String(CONFIRMATION_MAX_RETRIES)}): ${message}`,
			);
		}
	}
}

export async function waitForThreadToSettle(input: {
	client: ThreadStatusClient;
	threadId: string;
	events: CapturedEvent[];
	approvedRequestIds: Set<string>;
	dataTableId: string;
	logger: EvalLogger;
	timeoutMs: number;
	getStreamError?: () => unknown;
}): Promise<void> {
	const deadline = Date.now() + input.timeoutMs;
	const retryCounts = new Map<string, number>();

	while (Date.now() <= deadline) {
		throwIfStreamFailed(input.getStreamError?.());
		await approveEvalConfirmations({
			client: input.client,
			events: input.events,
			approvedRequestIds: input.approvedRequestIds,
			dataTableId: input.dataTableId,
			logger: input.logger,
			retryCounts,
		});
		throwIfStreamFailed(input.getStreamError?.());

		const status = await input.client.getThreadStatus(input.threadId);
		const runningBackgroundTasks = status.backgroundTasks.filter(
			(task) => task.status === 'running',
		);

		if (!status.hasActiveRun && !status.isSuspended && runningBackgroundTasks.length === 0) {
			await delay(SSE_SETTLE_DELAY_MS);
			await approveEvalConfirmations({
				client: input.client,
				events: input.events,
				approvedRequestIds: input.approvedRequestIds,
				dataTableId: input.dataTableId,
				logger: input.logger,
				retryCounts,
			});
			throwIfStreamFailed(input.getStreamError?.());
			const stableStatus = await input.client.getThreadStatus(input.threadId);
			const stableRunningBackgroundTasks = stableStatus.backgroundTasks.filter(
				(task) => task.status === 'running',
			);

			if (
				!stableStatus.hasActiveRun &&
				!stableStatus.isSuspended &&
				stableRunningBackgroundTasks.length === 0
			) {
				return;
			}
		}

		await delay(POLL_INTERVAL_MS);
	}

	throw new Error(
		`Timed out after ${String(input.timeoutMs)}ms waiting for thread ${input.threadId} to settle`,
	);
}

export async function runEvalSetupTopologyCase(
	config: EvalSetupTopologyRunnerConfig,
): Promise<EvalSetupTopologyCaseResult> {
	const { client, testCase, logger } = config;
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const events: CapturedEvent[] = [];
	const approvedRequestIds = new Set<string>();
	const abortController = new AbortController();
	let streamPromise: Promise<void> | undefined;
	let streamError: unknown;
	let projectId: string | undefined;
	let workflowId: string | undefined;
	let dataTableId: string | undefined;
	let threadId: string | undefined;
	let threadSettled = false;

	try {
		projectId = config.projectId ?? (await client.getPersonalProjectId());
		const importedWorkflow = await client.createWorkflow(
			buildWorkflowCreatePayload(testCase, projectId),
		);
		workflowId = importedWorkflow.id;

		const dataTable = await client.createDataTable(projectId, {
			name: uniqueName('eval-setup-topology-dataset', testCase.slug),
			columns: testCase.datasetColumns.map((columnName) => ({
				name: columnName,
				type: inferColumnType(testCase.datasetRows, columnName),
			})),
		});
		dataTableId = dataTable.id;
		await client.insertDataTableRows(projectId, dataTable.id, testCase.datasetRows);

		threadId = `eval-setup-topology-${crypto.randomUUID()}`;
		streamPromise = startSseConnection(client, threadId, events, abortController.signal).catch(
			(error) => {
				streamError = error;
			},
		);
		await delay(SSE_SETTLE_DELAY_MS);
		throwIfStreamFailed(streamError);

		await client.sendMessage(
			threadId,
			buildEvalPrompt({
				workflowId: importedWorkflow.id,
				workflowName: importedWorkflow.name,
				dataTableId: dataTable.id,
			}),
		);

		await waitForThreadToSettle({
			client,
			threadId,
			events,
			approvedRequestIds,
			dataTableId: dataTable.id,
			logger,
			timeoutMs,
			getStreamError: () => streamError,
		});
		threadSettled = true;

		abortController.abort();
		await streamPromise;
		throwIfStreamFailed(streamError);

		const threadMessages = await client.getThreadMessages(threadId).catch(() => undefined);
		const updatedWorkflow = await client.getWorkflow(importedWorkflow.id);
		const toolSelection = extractToolSelection({ events, threadMessages });
		const topology = verifyEvalSetupTopology({
			originalWorkflow: importedWorkflow,
			updatedWorkflow,
			datasetColumns: testCase.datasetColumns,
			sidecar: testCase.sidecar,
			expectedDataTableId: dataTable.id,
		});

		return {
			caseSlug: testCase.slug,
			workflowId: importedWorkflow.id,
			dataTableId: dataTable.id,
			toolSelection,
			topology,
			passed: toolSelection.findings.length === 0 && topology.passed,
		};
	} catch (error) {
		abortController.abort();
		if (threadId && !threadSettled) {
			await client.cancelRun(threadId).catch((cancelError) => {
				const message = cancelError instanceof Error ? cancelError.message : String(cancelError);
				logger.verbose(`Failed to cancel thread ${threadId}: ${message}`);
			});
		}
		if (streamPromise) {
			await streamPromise.catch((streamError) => {
				const message = streamError instanceof Error ? streamError.message : String(streamError);
				logger.verbose(`SSE stream ended with error during failure handling: ${message}`);
			});
		}

		const message = error instanceof Error ? error.message : String(error);
		const finding: TopologyFinding = {
			severity: 'error',
			code: 'runner_error',
			message,
		};

		return {
			caseSlug: testCase.slug,
			...(workflowId === undefined ? {} : { workflowId }),
			...(dataTableId === undefined ? {} : { dataTableId }),
			toolSelection: emptyToolSelection(),
			topology: runnerErrorTopology(finding),
			passed: false,
			error: message,
		};
	} finally {
		abortController.abort();
		if (streamPromise) {
			await streamPromise.catch((error) => {
				const message = error instanceof Error ? error.message : String(error);
				logger.verbose(`SSE cleanup error: ${message}`);
			});
		}

		if (!config.keepArtifacts && projectId) {
			if (workflowId) {
				await client.deleteWorkflow(workflowId).catch((error) => {
					const message = error instanceof Error ? error.message : String(error);
					logger.verbose(`Failed to clean up workflow ${workflowId}: ${message}`);
				});
			}
			if (dataTableId) {
				await client.deleteDataTable(projectId, dataTableId).catch((error) => {
					const message = error instanceof Error ? error.message : String(error);
					logger.verbose(`Failed to clean up DataTable ${dataTableId}: ${message}`);
				});
			}
		}
	}
}

function emptyToolSelection(): ToolSelectionResult {
	return {
		evalsToolCalled: false,
		evalSetupAgentCalled: false,
		findings: [],
	};
}

function runnerErrorTopology(finding: TopologyFinding): TopologyVerifierResult {
	return {
		passed: false,
		findings: [finding],
		targetResults: [],
		targetNodeNames: [],
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwIfStreamFailed(error: unknown): void {
	if (error) {
		throw error;
	}
}
