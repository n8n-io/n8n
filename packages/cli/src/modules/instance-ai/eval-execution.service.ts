import { randomUUID } from 'node:crypto';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import {
	type IDataObject,
	type IHttpRequestOptions,
	type INode,
	type IPinData,
	type IRun,
	type IRunExecutionData,
	type IWorkflowBase,
	type IWorkflowExecuteAdditionalData,
	createRunExecutionData,
	Workflow,
} from 'n8n-workflow';
import {
	type EvalLlmMockHandler,
	type EvalMockHttpResponse,
	ExecutionLifecycleHooks,
	WorkflowExecute,
} from 'n8n-core';

import { NodeTypes } from '@/node-types';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { getBase } from '@/workflow-execute-additional-data';
import { createLlmMockHandler } from './llm-mock-handler';
import { generateMockHints, identifyNodesForHints, type MockHints } from './eval-workflow-analysis';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Headers that should never be forwarded to the LLM mock handler */
const SENSITIVE_HEADERS = new Set([
	'authorization',
	'cookie',
	'proxy-authorization',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'api-key',
]);

/** Maximum number of output items to include per node in the result */
const MAX_OUTPUT_ITEMS_PER_NODE = 5;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EvalExecutionOptions {
	triggerData?: Record<string, unknown>;
	scenarioHints?: string;
}

export interface InterceptedRequest {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: unknown;
	nodeType: string;
}

export interface NodeResult {
	output: unknown;
	interceptedRequests: InterceptedRequest[];
}

export interface EvalExecutionResult {
	executionId: string;
	success: boolean;
	nodeResults: Record<string, NodeResult>;
	errors: string[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Executes workflows with LLM-based HTTP mocking for evaluation purposes.
 *
 * Orchestrates two phases:
 *   Phase 1: Analyze the workflow and generate consistent per-node mock hints
 *            (one LLM call, ensures cross-node data consistency)
 *   Phase 2: Execute the workflow with a mock HTTP handler that uses the hints
 *            to generate realistic API responses at interception time
 *
 * Safety: The mock handler is set per-execution on a fresh additionalData instance.
 * No global state is modified. Normal workflow executions are never affected.
 */
@Service()
export class EvalExecutionService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
	) {}

	async executeWithLlmMock(
		workflowId: string,
		user: User,
		options: EvalExecutionOptions = {},
	): Promise<EvalExecutionResult> {
		const executionId = randomUUID();

		const workflowEntity = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:execute',
		]);

		if (!workflowEntity) {
			return this.errorResult(executionId, `Workflow ${workflowId} not found or not accessible`);
		}

		const hints = await this.analyzeWorkflow(workflowEntity, options.scenarioHints);

		// Use explicitly provided trigger data if present, otherwise use LLM-generated data
		const triggerData = options.triggerData !== undefined ? options.triggerData : hints.triggerData;

		return await this.execute(
			workflowEntity,
			user,
			executionId,
			hints,
			triggerData,
			options.scenarioHints,
		);
	}

	// ── Phase 1: Workflow analysis ─────────────────────────────────────────

	private async analyzeWorkflow(
		workflowEntity: IWorkflowBase,
		scenarioHints?: string,
	): Promise<MockHints> {
		const hintNodes = identifyNodesForHints(workflowEntity);
		const nodeNames = hintNodes.map((n) => n.name);

		this.logger.debug(
			`[EvalMock] Generating hints for ${nodeNames.length} nodes: ${nodeNames.join(', ')}`,
		);

		const hints = await generateMockHints({
			workflow: workflowEntity,
			nodeNames,
			scenarioHints,
		});

		if (!hints.globalContext && nodeNames.length > 0) {
			this.logger.warn(
				'[EvalMock] Phase 1 hint generation returned empty — mock responses will lack cross-node consistency',
			);
		}

		return hints;
	}

	// ── Phase 2: Mock execution ────────────────────────────────────────────

	private async execute(
		workflowEntity: IWorkflowBase,
		user: User,
		executionId: string,
		hints: MockHints,
		triggerData: Record<string, unknown>,
		scenarioHints?: string,
	): Promise<EvalExecutionResult> {
		const nodeResults: Record<string, NodeResult> = {};

		const workflow = this.buildWorkflow(workflowEntity);
		const startNode = this.findStartNode(workflow);

		if (!startNode) {
			return this.errorResult(executionId, 'No trigger or start node found in the workflow');
		}

		const mockHandler = createLlmMockHandler({
			scenarioHints,
			globalContext: hints.globalContext,
			nodeHints: hints.nodeHints,
		});

		const additionalData = await getBase({
			userId: user.id,
			workflowId: workflowEntity.id,
			workflowSettings: workflowEntity.settings ?? {},
		});
		additionalData.evalLlmMockHandler = this.createSanitizingHandler(mockHandler, nodeResults);
		additionalData.hooks = new ExecutionLifecycleHooks('evaluation', executionId, workflowEntity);

		const pinData = this.buildPinData(startNode, triggerData);
		const executionData = this.buildExecutionData(startNode, triggerData, pinData);

		const result = await this.runWorkflow(workflow, additionalData, executionData);
		return this.buildResult(executionId, result, nodeResults);
	}

	// ── Workflow construction ──────────────────────────────────────────────

	private buildWorkflow(workflowEntity: IWorkflowBase): Workflow {
		return new Workflow({
			id: workflowEntity.id,
			name: workflowEntity.name,
			nodes: workflowEntity.nodes,
			connections: workflowEntity.connections,
			active: false,
			nodeTypes: this.nodeTypes,
			staticData: workflowEntity.staticData,
			settings: workflowEntity.settings ?? {},
		});
	}

	/**
	 * Find the workflow's trigger/start node.
	 * Uses Workflow.getStartNode() first (handles trigger, poll, and STARTING_NODE_TYPES),
	 * then falls back to checking for webhook nodes which getStartNode() doesn't cover.
	 */
	private findStartNode(workflow: Workflow): INode | undefined {
		return workflow.getStartNode() ?? this.findWebhookNode(workflow);
	}

	private findWebhookNode(workflow: Workflow): INode | undefined {
		return Object.values(workflow.nodes).find((node) => {
			if (node.disabled) return false;
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			return nodeType !== undefined && 'webhook' in nodeType;
		});
	}

	// ── Execution data ────────────────────────────────────────────────────

	private buildPinData(startNode: INode, triggerData: Record<string, unknown>): IPinData {
		if (Object.keys(triggerData).length === 0) return {};
		return { [startNode.name]: [{ json: triggerData as IDataObject }] };
	}

	/**
	 * Build execution data with the trigger node explicitly on the execution stack.
	 * We use processRunExecutionData() instead of run() because run() relies on
	 * getStartNode() which doesn't find webhook nodes (they define `webhook`,
	 * not `trigger`). This follows the same pattern as InstanceAiAdapterService.
	 */
	private buildExecutionData(
		startNode: INode,
		triggerData: Record<string, unknown>,
		pinData: IPinData,
	): IRunExecutionData {
		return createRunExecutionData({
			startData: {},
			resultData: { pinData, runData: {} },
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [
					{
						node: startNode,
						data: { main: [[{ json: triggerData as IDataObject }]] },
						source: null,
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		});
	}

	private async runWorkflow(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		executionData: IRunExecutionData,
	): Promise<IRun> {
		const workflowExecute = new WorkflowExecute(additionalData, 'evaluation', executionData);
		return await workflowExecute.processRunExecutionData(workflow);
	}

	// ── Request sanitization ──────────────────────────────────────────────

	/**
	 * Wraps the mock handler to strip sensitive headers and collect
	 * intercepted request metadata for diagnostics.
	 */
	private createSanitizingHandler(
		mockHandler: EvalLlmMockHandler,
		nodeResults: Record<string, NodeResult>,
	): EvalLlmMockHandler {
		return async (
			requestOptions: IHttpRequestOptions,
			node: INode,
		): Promise<EvalMockHttpResponse | undefined> => {
			const safeHeaders = redactHeaders(requestOptions.headers);
			const sanitizedOptions = { ...requestOptions, headers: safeHeaders };

			const entry = (nodeResults[node.name] ??= { output: null, interceptedRequests: [] });
			entry.interceptedRequests.push({
				url: requestOptions.url,
				method: requestOptions.method ?? 'GET',
				headers: safeHeaders,
				body: requestOptions.body,
				nodeType: node.type,
			});

			this.logger.debug(
				`[EvalMock] Intercepted ${requestOptions.method ?? 'GET'} ${requestOptions.url} from "${node.name}" (${node.type})`,
			);

			return await mockHandler(sanitizedOptions, node);
		};
	}

	// ── Result extraction ─────────────────────────────────────────────────

	private buildResult(
		executionId: string,
		result: IRun,
		nodeResults: Record<string, NodeResult>,
	): EvalExecutionResult {
		const errors: string[] = [];

		const runData = result.data?.resultData?.runData ?? {};
		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			const entry = (nodeResults[nodeName] ??= { output: null, interceptedRequests: [] });
			const lastRun = nodeRuns[nodeRuns.length - 1];
			if (lastRun?.data?.main?.[0]) {
				entry.output = lastRun.data.main[0].slice(0, MAX_OUTPUT_ITEMS_PER_NODE);
			}
			if (lastRun?.error) {
				errors.push(`Node "${nodeName}": ${lastRun.error.message}`);
			}
		}

		const executionError = result.data?.resultData?.error;
		if (executionError) {
			errors.push(`Workflow error: ${executionError.message}`);
		}

		return {
			executionId,
			success: executionError === undefined && errors.length === 0,
			nodeResults,
			errors,
		};
	}

	private errorResult(executionId: string, message: string): EvalExecutionResult {
		return { executionId, success: false, nodeResults: {}, errors: [message] };
	}
}

// ---------------------------------------------------------------------------
// Pure helpers (no service dependency)
// ---------------------------------------------------------------------------

function redactHeaders(
	headers?: Record<string, string | string[]> | IDataObject,
): Record<string, string> {
	const safe: Record<string, string> = {};
	if (!headers) return safe;
	for (const [key, value] of Object.entries(headers)) {
		safe[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : String(value);
	}
	return safe;
}
