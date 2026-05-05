import crypto from 'node:crypto';

import type { N8nClient, WorkflowCreatePayload, WorkflowResponse } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import type { EvalLogger } from '../harness/logger';
import type { CapturedEvent } from '../types';
import { verifyDataset } from './dataset-verifier';
import { extractToolSelection } from './tool-selection';
import type {
	DatasetFinding,
	DatasetVerifierResult,
	EvalDataQualityCase,
	EvalDataQualityCaseResult,
	SemanticJudgeFn,
	ToolSelectionResult,
} from './types';

const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const CONFIRMATION_MAX_RETRIES = 5;

export interface EvalDataQualityRunnerConfig {
	client: N8nClient;
	testCase: EvalDataQualityCase;
	logger: EvalLogger;
	timeoutMs?: number;
	keepArtifacts?: boolean;
	projectId?: string;
	judge?: SemanticJudgeFn;
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

export function rewriteDataTableId(
	workflow: WorkflowResponse,
	dataTableNodeName: string | undefined,
	dataTableId: string,
): WorkflowResponse {
	const nodes = workflow.nodes.map((node) => {
		const matchesNamedTarget = dataTableNodeName === node.name;
		const hasDataTableId = node.parameters && 'dataTableId' in node.parameters;
		if (!matchesNamedTarget && !hasDataTableId) return node;

		const parameters = { ...(node.parameters ?? {}) };
		const existing = parameters.dataTableId;
		if (isResourceLocatorValue(existing)) {
			parameters.dataTableId = { ...existing, value: dataTableId };
		} else {
			parameters.dataTableId = dataTableId;
		}

		return { ...node, parameters };
	});

	return { ...workflow, nodes };
}

function isResourceLocatorValue(
	value: unknown,
): value is { __rl: true; mode: string; value: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'__rl' in value &&
		(value as { __rl: unknown }).__rl === true
	);
}

export function buildWorkflowCreatePayload(
	workflow: WorkflowResponse,
	slug: string,
	projectId?: string,
): WorkflowCreatePayload {
	return {
		name: uniqueName('eval-data-quality', slug),
		nodes: workflow.nodes.map((node) => {
			const cleaned = { ...node };
			delete cleaned.credentials;
			return cleaned;
		}),
		connections: workflow.connections,
		...(projectId === undefined ? {} : { projectId }),
		...(workflow.pinData === undefined ? {} : { pinData: workflow.pinData }),
	};
}

export function buildEvalPrompt(input: {
	workflowId: string;
	workflowName: string;
	dataTableId: string;
	requestedRowCount: number;
	targetAgentNodeName?: string;
}): string {
	const lines = [
		`Generate ${String(input.requestedRowCount)} synthetic eval rows for the workflow "${input.workflowName}" (id ${input.workflowId}).`,
		`Use the existing eval DataTable (id ${input.dataTableId}); do not create a new DataTable.`,
		'Call the eval-data tool — that is the only correct way to populate the DataTable.',
		'Approve only the eval-data confirmation; do not propose new eval nodes.',
	];
	if (input.targetAgentNodeName !== undefined) {
		lines.push(`Target the AI agent node "${input.targetAgentNodeName}".`);
	}
	return lines.join('\n');
}

export function isEvalDataConfirmation(event: CapturedEvent): boolean {
	if (event.type !== 'confirmation-request') return false;
	const payload = event.data.payload;
	if (isRecord(payload) && payload.toolName === 'eval-data') return true;
	return event.data.toolName === 'eval-data';
}

export function extractConfirmationRequestId(event: CapturedEvent): string | undefined {
	if (typeof event.data.requestId === 'string') return event.data.requestId;
	const payload = event.data.payload;
	if (isRecord(payload) && typeof payload.requestId === 'string') return payload.requestId;
	return undefined;
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
				if (!isRecord(data)) return;
				events.push({
					timestamp: Date.now(),
					type: typeof data.type === 'string' ? data.type : (event.type ?? 'unknown'),
					data,
				});
			} catch {
				// SSE may include transient non-JSON payloads; ignore.
			}
		},
		signal,
	);
}

export async function approveEvalDataConfirmation(input: {
	client: ConfirmationClient;
	events: CapturedEvent[];
	approvedRequestIds: Set<string>;
	logger: EvalLogger;
	retryCounts?: Map<string, number>;
}): Promise<void> {
	for (const event of input.events) {
		if (!isEvalDataConfirmation(event)) continue;

		const requestId = extractConfirmationRequestId(event);
		if (!requestId || input.approvedRequestIds.has(requestId)) continue;

		const retryCounts = input.retryCounts ?? new Map<string, number>();
		const retryCount = retryCounts.get(requestId) ?? 0;
		if (retryCount >= CONFIRMATION_MAX_RETRIES) continue;

		try {
			input.logger.verbose(`[auto-approve] Approving eval-data confirmation: ${requestId}`);
			await input.client.confirmAction(requestId, { kind: 'approval', approved: true });
			input.approvedRequestIds.add(requestId);
			retryCounts.delete(requestId);
		} catch (error) {
			retryCounts.set(requestId, retryCount + 1);
			const message = error instanceof Error ? error.message : String(error);
			input.logger.verbose(
				`[auto-approve] Failed to approve ${requestId} (attempt ${String(retryCount + 1)}/${String(CONFIRMATION_MAX_RETRIES)}): ${message}`,
			);
		}
	}
}

export async function waitForThreadToSettle(input: {
	client: ThreadStatusClient;
	threadId: string;
	events: CapturedEvent[];
	approvedRequestIds: Set<string>;
	logger: EvalLogger;
	timeoutMs: number;
	getStreamError?: () => unknown;
}): Promise<void> {
	const deadline = Date.now() + input.timeoutMs;
	const retryCounts = new Map<string, number>();

	while (Date.now() <= deadline) {
		throwIfStreamFailed(input.getStreamError?.());
		await approveEvalDataConfirmation({
			client: input.client,
			events: input.events,
			approvedRequestIds: input.approvedRequestIds,
			logger: input.logger,
			retryCounts,
		});

		const status = await input.client.getThreadStatus(input.threadId);
		const runningBackgroundTasks = status.backgroundTasks.filter(
			(task) => task.status === 'running',
		);

		if (!status.hasActiveRun && !status.isSuspended && runningBackgroundTasks.length === 0) {
			await delay(SSE_SETTLE_DELAY_MS);
			await approveEvalDataConfirmation({
				client: input.client,
				events: input.events,
				approvedRequestIds: input.approvedRequestIds,
				logger: input.logger,
				retryCounts,
			});
			throwIfStreamFailed(input.getStreamError?.());
			const stable = await input.client.getThreadStatus(input.threadId);
			const stableRunning = stable.backgroundTasks.filter((task) => task.status === 'running');
			if (!stable.hasActiveRun && !stable.isSuspended && stableRunning.length === 0) return;
		}

		await delay(POLL_INTERVAL_MS);
	}

	throw new Error(
		`Timed out after ${String(input.timeoutMs)}ms waiting for thread ${input.threadId} to settle`,
	);
}

export async function runEvalDataQualityCase(
	config: EvalDataQualityRunnerConfig,
): Promise<EvalDataQualityCaseResult> {
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

		const dataTable = await client.createDataTable(projectId, {
			name: uniqueName('eval-data-quality-dt', testCase.slug),
			columns: testCase.sidecar.columns,
		});
		dataTableId = dataTable.id;

		const wired = rewriteDataTableId(
			testCase.workflow,
			testCase.sidecar.dataTableNodeName,
			dataTable.id,
		);
		const importedWorkflow = await client.createWorkflow(
			buildWorkflowCreatePayload(wired, testCase.slug, projectId),
		);
		workflowId = importedWorkflow.id;

		threadId = `eval-data-quality-${crypto.randomUUID()}`;
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
				requestedRowCount: testCase.sidecar.requestedRowCount,
				targetAgentNodeName: testCase.sidecar.targetAgentNodeName,
			}),
		);

		await waitForThreadToSettle({
			client,
			threadId,
			events,
			approvedRequestIds,
			logger,
			timeoutMs,
			getStreamError: () => streamError,
		});
		threadSettled = true;

		abortController.abort();
		await streamPromise;
		throwIfStreamFailed(streamError);

		const threadMessages = await client.getThreadMessages(threadId).catch(() => undefined);
		const toolSelection = extractToolSelection({ events, threadMessages });
		const rowsResponse = await client.getDataTableRows(projectId, dataTable.id, { take: 200 });
		const dataTableColumns = (dataTable.columns ?? testCase.sidecar.columns).map((column) => ({
			name: column.name,
			type: column.type,
		}));
		const dataset = await verifyDataset(
			{
				rows: rowsResponse.data,
				dataTableColumns,
				sidecar: testCase.sidecar,
				requestedRowCount: testCase.sidecar.requestedRowCount,
			},
			{ judge: config.judge },
		);

		return {
			caseSlug: testCase.slug,
			workflowId: importedWorkflow.id,
			dataTableId: dataTable.id,
			toolSelection,
			dataset,
			passed: toolSelection.findings.length === 0 && dataset.passed,
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
			await streamPromise.catch((streamCleanupError) => {
				const message =
					streamCleanupError instanceof Error
						? streamCleanupError.message
						: String(streamCleanupError);
				logger.verbose(`SSE stream ended with error during failure handling: ${message}`);
			});
		}

		const message = error instanceof Error ? error.message : String(error);
		const finding: DatasetFinding = {
			severity: 'error',
			code: 'runner_error',
			message,
		};

		return {
			caseSlug: testCase.slug,
			...(workflowId === undefined ? {} : { workflowId }),
			...(dataTableId === undefined ? {} : { dataTableId }),
			toolSelection: emptyToolSelection(),
			dataset: runnerErrorDataset(finding),
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
	return { evalDataToolCalled: false, findings: [] };
}

function runnerErrorDataset(finding: DatasetFinding): DatasetVerifierResult {
	return {
		passed: false,
		findings: [finding],
		rowCount: 0,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwIfStreamFailed(error: unknown): void {
	if (error === undefined || error === null) return;
	if (error instanceof Error) throw error;
	throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
}
