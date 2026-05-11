import crypto from 'node:crypto';

import { consumeSseStream } from '../clients/sse-client';
import type { N8nClient, WorkflowCreatePayload, WorkflowResponse } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import type { CapturedEvent } from '../types';
import { extractToolSelection } from './tool-selection';
import type {
	EvalDataTableSpec,
	EvalEndToEndCase,
	EvalEndToEndCaseResult,
	EvalEndToEndExecutionResult,
	EvalEndToEndFinding,
	EvalEndToEndMode,
	EvalEndToEndToolSelectionResult,
	EvalEndToEndTopologyResult,
} from './types';

const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const CONFIRMATION_MAX_RETRIES = 5;
const EVAL_EXECUTION_TIMEOUT_MS = 300_000;

const EVALUATION_TRIGGER_TYPE = 'n8n-nodes-base.evaluationTrigger';
const EVALUATION_NODE_TYPE = 'n8n-nodes-base.evaluation';

export interface EvalEndToEndRunnerConfig {
	client: N8nClient;
	testCase: EvalEndToEndCase;
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

export function buildWorkflowCreatePayload(
	testCase: EvalEndToEndCase,
	projectId?: string,
): WorkflowCreatePayload {
	const workflow = testCase.workflow;

	return {
		name: uniqueName('eval-end-to-end', testCase.slug),
		nodes: workflow.nodes.map(({ credentials: _credentials, ...node }) => node),
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
	mode: EvalEndToEndMode;
}): string {
	if (input.mode === 'already-configured') {
		return [
			`Workflow ${input.workflowId} (${input.workflowName}) already has eval nodes.`,
			'Do not add new evals — just confirm that the existing eval setup looks correct.',
		].join('\n');
	}

	if (input.mode === 'no-ai-nodes') {
		return [
			`Try to add an evaluation suite to workflow ${input.workflowId} (${input.workflowName}).`,
			'If eval setup is not applicable (workflow has no AI nodes), respect that and do not force it.',
		].join('\n');
	}

	return [
		`I want to add test cases to workflow ${input.workflowId} (${input.workflowName}) so I can check it keeps producing the right answers when I change prompts or models later.`,
		'Please set the whole thing up: wire test cases against each AI agent in the workflow, and seed the table with some sample input rows so I have something to run against.',
		'Go ahead and approve any confirmation dialogs you show me along the way.',
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

const EVALS_TOOL_NAME = 'evals';

export function isApprovableConfirmation(event: CapturedEvent): boolean {
	if (event.type !== 'confirmation-request') {
		return false;
	}
	// Only auto-approve confirmations emitted by the `evals` tool
	// (select-metrics, offer-data-population). The `offer` action no longer
	// suspends — it returns a chat message and the user replies naturally —
	// so it never reaches this path. Confirmations from any other tool
	// (e.g. credentials/workflow setup, build-workflow update prompts) are
	// intentionally left untouched: in the end-to-end suite they would
	// indicate the agent wandered off the eval chain, and a stalled thread
	// is the signal we want — not a silent auto-approve that masks the drift.
	const payload = event.data.payload;
	if (!isRecord(payload)) return false;
	return payload.toolName === EVALS_TOOL_NAME;
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
				// SSE can include transient non-JSON payloads; not useful for verification.
			}
		},
		signal,
	);
}

export async function approveConfirmations(input: {
	client: ConfirmationClient;
	events: CapturedEvent[];
	approvedRequestIds: Set<string>;
	logger: EvalLogger;
	retryCounts?: Map<string, number>;
}): Promise<void> {
	for (const event of input.events) {
		if (!isApprovableConfirmation(event)) continue;

		const requestId = extractConfirmationRequestId(event);
		if (!requestId || input.approvedRequestIds.has(requestId)) continue;

		const retryCounts = input.retryCounts ?? new Map<string, number>();
		const retryCount = retryCounts.get(requestId) ?? 0;
		if (retryCount >= CONFIRMATION_MAX_RETRIES) continue;

		try {
			input.logger.verbose(`[auto-approve] Approving confirmation: ${requestId}`);
			await input.client.confirmAction(requestId, { kind: 'approval', approved: true });
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
	logger: EvalLogger;
	timeoutMs: number;
	getStreamError?: () => unknown;
}): Promise<void> {
	const deadline = Date.now() + input.timeoutMs;
	const retryCounts = new Map<string, number>();

	while (Date.now() <= deadline) {
		throwIfStreamFailed(input.getStreamError?.());
		await approveConfirmations({
			client: input.client,
			events: input.events,
			approvedRequestIds: input.approvedRequestIds,
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
			await approveConfirmations({
				client: input.client,
				events: input.events,
				approvedRequestIds: input.approvedRequestIds,
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

/**
 * Returns a clone of `workflow` with every `dataTableId` reference inside an
 * EvaluationTrigger / Evaluation node rewritten to `dataTableId`.
 *
 * Supports both `dataTableId: 'plain-string'` and the resource-locator object
 * form `{ __rl?, mode, value }` used by node-rendered fixtures.
 */
export function applyEvalDataTableId(
	workflow: WorkflowResponse,
	dataTableId: string,
): WorkflowResponse {
	const cloned: WorkflowResponse = structuredClone(workflow);
	for (const node of cloned.nodes) {
		if (node.type !== EVALUATION_TRIGGER_TYPE && node.type !== EVALUATION_NODE_TYPE) continue;
		const params = (node as { parameters?: Record<string, unknown> }).parameters;
		if (!isRecord(params)) continue;
		if (!('dataTableId' in params)) continue;
		const current = params.dataTableId;
		if (typeof current === 'string') {
			params.dataTableId = dataTableId;
		} else if (isRecord(current)) {
			params.dataTableId = { ...current, value: dataTableId };
		}
	}
	return cloned;
}

/**
 * Create a DataTable in the test project and seed it with the spec rows.
 * Returns the new DataTable id, which the runner then patches into the
 * workflow before importing.
 */
export async function provisionEvalDataTable(input: {
	client: Pick<N8nClient, 'createDataTable' | 'insertDataTableRows'>;
	projectId: string;
	spec: EvalDataTableSpec;
}): Promise<string> {
	const created = await input.client.createDataTable(input.projectId, {
		name: input.spec.name,
		columns: input.spec.columns,
	});
	if (input.spec.rows.length > 0) {
		await input.client.insertDataTableRows(input.projectId, created.id, input.spec.rows);
	}
	return created.id;
}

export function findEvaluationTriggerDataTableId(workflow: WorkflowResponse): string | undefined {
	for (const node of workflow.nodes) {
		if (node.type !== EVALUATION_TRIGGER_TYPE) continue;
		const params = (node as { parameters?: Record<string, unknown> }).parameters;
		if (!isRecord(params)) continue;
		const dataTableId = params.dataTableId;
		if (typeof dataTableId === 'string' && dataTableId.length > 0) return dataTableId;
		// Some templates nest the id inside a credential-like object: { value: '...' }
		if (isRecord(dataTableId) && typeof dataTableId.value === 'string') return dataTableId.value;
	}
	return undefined;
}

export function evaluateTopology(updatedWorkflow: WorkflowResponse): {
	evaluationTriggerFound: boolean;
	evaluationNodeFound: boolean;
	dataTableId?: string;
} {
	const evaluationTriggerFound = updatedWorkflow.nodes.some(
		(node) => node.type === EVALUATION_TRIGGER_TYPE,
	);
	const evaluationNodeFound = updatedWorkflow.nodes.some(
		(node) => node.type === EVALUATION_NODE_TYPE,
	);
	const dataTableId = findEvaluationTriggerDataTableId(updatedWorkflow);
	return { evaluationTriggerFound, evaluationNodeFound, dataTableId };
}

export async function runEvalEndToEndCase(
	config: EvalEndToEndRunnerConfig,
): Promise<EvalEndToEndCaseResult> {
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

		// `already-configured` fixtures reference a DataTable by id. The captured
		// id is meaningless against a fresh n8n instance — provision a real one
		// here and rewrite the workflow so the existing eval nodes point at it.
		let workflowToImport = testCase.workflow;
		if (testCase.evalDataTable) {
			dataTableId = await provisionEvalDataTable({
				client,
				projectId,
				spec: testCase.evalDataTable,
			});
			workflowToImport = applyEvalDataTableId(workflowToImport, dataTableId);
		}

		const importedWorkflow = await client.createWorkflow(
			buildWorkflowCreatePayload({ ...testCase, workflow: workflowToImport }, projectId),
		);
		workflowId = importedWorkflow.id;

		threadId = `eval-end-to-end-${crypto.randomUUID()}`;
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
				mode: testCase.mode,
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
		const updatedWorkflow = await client.getWorkflow(importedWorkflow.id);

		const rawToolSelection = extractToolSelection({ events, threadMessages });
		const toolSelection = filterToolSelectionForMode(rawToolSelection, testCase.mode);

		const topologyShape = evaluateTopology(updatedWorkflow);
		// Prefer the id discovered in the live workflow, but fall back to the
		// pre-provisioned id so the cleanup path can still delete an orphan
		// DataTable when the agent stripped the eval nodes.
		dataTableId = topologyShape.dataTableId ?? dataTableId;

		const topology: EvalEndToEndTopologyResult = {
			evaluationTriggerFound: topologyShape.evaluationTriggerFound,
			evaluationNodeFound: topologyShape.evaluationNodeFound,
			dataTableId: topologyShape.dataTableId,
			dataTableRowCount: 0,
			findings: [],
		};

		// Topology assertions are only meaningful when we expect new eval setup.
		const expectsNewTopology = testCase.mode === 'eligible';

		if (expectsNewTopology) {
			if (!topologyShape.evaluationTriggerFound) {
				topology.findings.push({
					severity: 'error',
					code: 'evaluation_trigger_missing',
					message: 'Updated workflow does not contain an EvaluationTrigger node.',
				});
			}
			if (!topologyShape.evaluationNodeFound) {
				topology.findings.push({
					severity: 'error',
					code: 'evaluation_node_missing',
					message: 'Updated workflow does not contain an Evaluation node.',
				});
			}
		}

		if (testCase.mode === 'no-ai-nodes') {
			// In skip mode the agent must NOT have fabricated eval nodes despite
			// our prompt asking for them — that would be a real bug.
			if (topologyShape.evaluationTriggerFound || topologyShape.evaluationNodeFound) {
				topology.findings.push({
					severity: 'error',
					code: 'unexpected_eval_nodes_added',
					message: `Workflow mode is ${testCase.mode} but the agent added eval nodes anyway.`,
				});
			}
		}

		// DataTable assertions: only for modes where we expect a populated DataTable.
		const expectsPopulatedDataTable =
			testCase.mode === 'eligible' || testCase.mode === 'already-configured';

		if (expectsPopulatedDataTable && topologyShape.dataTableId !== undefined) {
			try {
				const rows = await client.getDataTableRows(projectId, topologyShape.dataTableId, {
					take: 1,
				});
				topology.dataTableRowCount = rows.count ?? 0;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				topology.findings.push({
					severity: 'error',
					code: 'data_table_read_failed',
					message: `Failed to read DataTable ${topologyShape.dataTableId}: ${message}`,
				});
			}
		} else if (expectsPopulatedDataTable) {
			topology.findings.push({
				severity: 'error',
				code: 'data_table_id_missing',
				message: 'EvaluationTrigger does not reference a DataTable id.',
			});
		}

		if (
			testCase.mode === 'eligible' &&
			topologyShape.dataTableId !== undefined &&
			topology.dataTableRowCount === 0
		) {
			topology.findings.push({
				severity: 'error',
				code: 'data_table_empty',
				message: 'eval-data did not populate the DataTable with sample rows.',
			});
		}

		const execution = await runEvalExecutionForMode({
			client,
			workflowId: importedWorkflow.id,
			mode: testCase.mode,
			topologyShape,
			dataTableRowCount: topology.dataTableRowCount,
			logger,
		});

		const skipsExecution = testCase.mode === 'no-ai-nodes';
		const passed =
			toolSelection.findings.length === 0 &&
			topology.findings.length === 0 &&
			(skipsExecution || (execution.attempted && execution.success));

		return {
			caseSlug: testCase.slug,
			mode: testCase.mode,
			workflowId: importedWorkflow.id,
			...(dataTableId === undefined ? {} : { dataTableId }),
			toolSelection,
			topology,
			execution,
			passed,
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
			await streamPromise.catch((cleanupError) => {
				const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
				logger.verbose(`SSE stream ended with error during failure handling: ${message}`);
			});
		}

		const message = error instanceof Error ? error.message : String(error);
		const finding: EvalEndToEndFinding = {
			severity: 'error',
			code: 'runner_error',
			message,
		};

		return {
			caseSlug: testCase.slug,
			mode: testCase.mode,
			...(workflowId === undefined ? {} : { workflowId }),
			...(dataTableId === undefined ? {} : { dataTableId }),
			toolSelection: emptyToolSelection(),
			topology: runnerErrorTopology(finding),
			execution: { attempted: false, success: false, errors: [message] },
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

async function runEvalExecutionForMode(input: {
	client: Pick<N8nClient, 'executeWithLlmMock'>;
	workflowId: string;
	mode: EvalEndToEndMode;
	topologyShape: { evaluationTriggerFound: boolean; evaluationNodeFound: boolean };
	dataTableRowCount: number;
	logger: EvalLogger;
}): Promise<EvalEndToEndExecutionResult> {
	if (input.mode === 'no-ai-nodes') {
		return {
			attempted: false,
			success: false,
			errors: ['Execution intentionally skipped — workflow is not eligible for eval setup.'],
		};
	}

	const topologyOk =
		input.topologyShape.evaluationTriggerFound &&
		input.topologyShape.evaluationNodeFound &&
		input.dataTableRowCount > 0;

	if (!topologyOk) {
		return {
			attempted: false,
			success: false,
			errors: ['Skipped execution — eval topology or DataTable is incomplete.'],
		};
	}

	try {
		const result = await input.client.executeWithLlmMock(
			input.workflowId,
			undefined,
			EVAL_EXECUTION_TIMEOUT_MS,
		);
		return {
			attempted: true,
			success: result.success,
			executionId: result.executionId,
			errors: result.errors,
			rawResult: result,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		input.logger.verbose(`executeWithLlmMock failed: ${message}`);
		return {
			attempted: true,
			success: false,
			errors: [message],
		};
	}
}

/**
 * Resolve tool-selection findings for the case's mode.
 *
 * - `eligible`: keep every "X not called" finding from `extractToolSelection`.
 * - `already-configured` / `no-ai-nodes`: the agent must NOT add new evals.
 *   Drop the "not called" findings (the absence is correct), and ADD findings
 *   for any chain tool that WAS called — that's the real bug in these modes.
 */
export function filterToolSelectionForMode(
	raw: EvalEndToEndToolSelectionResult,
	mode: EvalEndToEndMode,
): EvalEndToEndToolSelectionResult {
	if (mode === 'eligible') return raw;

	const findings = raw.findings.filter(
		(finding) =>
			finding.code !== 'evals_tool_not_called' &&
			finding.code !== 'evals_propose_not_called' &&
			finding.code !== 'eval_setup_agent_not_called' &&
			finding.code !== 'eval_data_tool_not_called',
	);

	if (raw.evalSetupAgentCalled) {
		findings.push({
			severity: 'error',
			code: 'eval_setup_agent_unexpectedly_called',
			message: `Workflow mode is ${mode} but the agent invoked eval-setup-with-agent anyway.`,
		});
	}
	if (raw.evalDataToolCalled) {
		findings.push({
			severity: 'error',
			code: 'eval_data_tool_unexpectedly_called',
			message: `Workflow mode is ${mode} but the agent invoked eval-data anyway.`,
		});
	}

	return {
		evalsToolCalled: raw.evalsToolCalled,
		evalsActionsCalled: raw.evalsActionsCalled,
		evalSetupAgentCalled: raw.evalSetupAgentCalled,
		evalDataToolCalled: raw.evalDataToolCalled,
		findings,
	};
}

function emptyToolSelection(): EvalEndToEndToolSelectionResult {
	return {
		evalsToolCalled: false,
		evalsActionsCalled: [],
		evalSetupAgentCalled: false,
		evalDataToolCalled: false,
		findings: [],
	};
}

function runnerErrorTopology(finding: EvalEndToEndFinding): EvalEndToEndTopologyResult {
	return {
		evaluationTriggerFound: false,
		evaluationNodeFound: false,
		dataTableRowCount: 0,
		findings: [finding],
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwIfStreamFailed(error: unknown): void {
	if (error) throw error;
}
