import type {
	InstanceAiEvalExecutionRequest,
	InstanceAiEvalNodeResult,
	InstanceAiEvalExecutionResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	type EvalLlmMockHandler,
	type EvalMockHttpResponse,
	ExecutionLifecycleHooks,
	WorkflowExecute,
} from 'n8n-core';
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
	NodeHelpers,
	Workflow,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { NodeTypes } from '@/node-types';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { normalizePinData } from '@n8n/workflow-sdk';

import { generatePinData } from './pin-data-generator';

import {
	generateMockHints,
	identifyNodesForHints,
	identifyNodesForPinData,
	type MockHints,
} from './workflow-analysis';
import { createLlmMockHandler } from './mock-handler';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of output items to include per node in the result */
const MAX_OUTPUT_ITEMS_PER_NODE = 5;

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
		options: InstanceAiEvalExecutionRequest = {},
	): Promise<InstanceAiEvalExecutionResult> {
		const executionId = randomUUID();

		const workflowEntity = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:execute',
		]);

		if (!workflowEntity) {
			return this.errorResult(executionId, `Workflow ${workflowId} not found or not accessible`);
		}

		const hints = await this.analyzeWorkflow(workflowEntity, options.scenarioHints);

		return await this.execute(workflowEntity, user, executionId, hints, options.scenarioHints);
	}

	// ── Phase 1: Workflow analysis ─────────────────────────────────────────

	private async analyzeWorkflow(
		workflowEntity: IWorkflowBase,
		scenarioHints?: string,
	): Promise<MockHints> {
		// Phase 1: Generate mock hints for HTTP-interceptible nodes
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

		this.logger.debug(
			`[EvalMock] Phase 1 result — globalContext: ${hints.globalContext ? 'present' : 'EMPTY'}, triggerContent keys: ${JSON.stringify(Object.keys(hints.triggerContent))}, nodeHints: ${Object.keys(hints.nodeHints).join(', ')}`,
		);

		// Phase 1.5: Generate pin data for nodes that bypass the HTTP mock layer
		const bypassNodes = identifyNodesForPinData(workflowEntity);
		const bypassNodeNames = bypassNodes.map((n) => n.name);

		if (bypassNodeNames.length > 0) {
			this.logger.debug(
				`[EvalMock] Generating pin data for ${bypassNodeNames.length} bypass nodes: ${bypassNodeNames.join(', ')}`,
			);
			hints.bypassPinData = await this.generateBypassPinData(
				workflowEntity,
				bypassNodeNames,
				hints.globalContext,
				scenarioHints,
			);
			this.logger.debug(
				`[EvalMock] Phase 1.5 result — pinned nodes: ${Object.keys(hints.bypassPinData).join(', ') || 'none'}`,
			);
		}

		return hints;
	}

	// ── Phase 1.5: Pin data for bypass nodes ─────────────────────────────

	/**
	 * Generate pin data for nodes that bypass the HTTP mock layer.
	 * Uses the existing LLM-based pin data generator with Phase 1's globalContext
	 * for cross-node data consistency.
	 */
	private async generateBypassPinData(
		workflowEntity: IWorkflowBase,
		bypassNodeNames: string[],
		globalContext: string,
		scenarioHints?: string,
	): Promise<IPinData> {
		if (bypassNodeNames.length === 0) return {};

		try {
			const dataDescription = [globalContext, scenarioHints].filter(Boolean).join('\n\n');
			const result = await generatePinData({
				workflow: workflowEntity as unknown as WorkflowJSON,
				nodeNames: bypassNodeNames,
				instructions: dataDescription ? { dataDescription } : undefined,
			});

			return normalizePinData(result as unknown as IPinData);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			this.logger.error(`[EvalMock] Phase 1.5 pin data generation failed: ${errorMsg}`);
			return normalizePinData(
				Object.fromEntries(
					bypassNodeNames.map((nodeName) => [nodeName, [{ json: {} }]]),
				) as IPinData,
			);
		}
	}

	// ── Phase 2: Mock execution ────────────────────────────────────────────

	private async execute(
		workflowEntity: IWorkflowBase,
		user: User,
		executionId: string,
		hints: MockHints,
		scenarioHints?: string,
	): Promise<InstanceAiEvalExecutionResult> {
		const nodeResults: Record<string, InstanceAiEvalNodeResult> = {};

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
		additionalData.evalLlmMockHandler = this.createInterceptingHandler(mockHandler, nodeResults);
		additionalData.hooks = new ExecutionLifecycleHooks('evaluation', executionId, workflowEntity);

		const triggerPinData = this.buildTriggerPinData(startNode, hints.triggerContent);
		const pinData: IPinData = { ...triggerPinData, ...hints.bypassPinData };
		const pinDataNodeNames = Object.keys(pinData);

		// Check config completeness before execution — detect missing required parameters
		this.checkNodeConfig(workflow, nodeResults, pinDataNodeNames);
		const executionData = this.buildExecutionData(startNode, pinData);

		// Mark the trigger node as pinned (it gets its output from pin data, not execution)
		// Preserve any configIssues that checkNodeConfig may have already recorded.
		if (Object.keys(triggerPinData).length > 0) {
			const existing = nodeResults[startNode.name];
			nodeResults[startNode.name] = {
				output: null,
				interceptedRequests: [],
				executionMode: 'pinned',
				...(existing?.configIssues ? { configIssues: existing.configIssues } : {}),
			};
		}

		// Mark bypass nodes as pinned
		for (const nodeName of Object.keys(hints.bypassPinData)) {
			const existing = nodeResults[nodeName];
			nodeResults[nodeName] = {
				output: null,
				interceptedRequests: [],
				executionMode: 'pinned',
				...(existing?.configIssues ? { configIssues: existing.configIssues } : {}),
			};
		}

		try {
			const result = await this.runWorkflow(workflow, additionalData, executionData);
			return this.buildResult(executionId, result, nodeResults, hints);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`[EvalMock] Workflow execution failed: ${message}`);
			return {
				executionId,
				success: false,
				nodeResults,
				errors: [`Execution failed: ${message}`],
				hints,
			};
		}
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

	/**
	 * Check each node for missing required parameters and record issues
	 * in nodeResults. This runs before execution so the report shows
	 * configuration completeness regardless of whether the node crashes.
	 */
	private checkNodeConfig(
		workflow: Workflow,
		nodeResults: Record<string, InstanceAiEvalNodeResult>,
		pinDataNodeNames: string[],
	): void {
		for (const node of Object.values(workflow.nodes)) {
			if (node.disabled) continue;
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			if (!nodeType) continue;

			const issues = NodeHelpers.getNodeParametersIssues(
				nodeType.description.properties,
				node,
				nodeType.description,
				pinDataNodeNames,
			);

			if (issues?.parameters && Object.keys(issues.parameters).length > 0) {
				const entry = (nodeResults[node.name] ??= {
					output: null,
					interceptedRequests: [],
					executionMode: 'real',
				});
				entry.configIssues = issues.parameters;
			}
		}
	}

	// ── Execution data ────────────────────────────────────────────────────

	/**
	 * Build pin data for the trigger/start node from LLM-generated content.
	 * Pin data provides the trigger's output — the node doesn't execute,
	 * since trigger nodes receive external events that don't fire in eval mode.
	 */
	private buildTriggerPinData(startNode: INode, triggerContent: Record<string, unknown>): IPinData {
		if (Object.keys(triggerContent).length === 0) return {};
		return { [startNode.name]: [{ json: triggerContent as IDataObject }] };
	}

	/**
	 * Build execution data with the trigger node on the execution stack.
	 * We use processRunExecutionData() instead of run() because run() relies on
	 * getStartNode() which doesn't find webhook nodes (they define `webhook`,
	 * not `trigger`). This follows the same pattern as InstanceAiAdapterService.
	 * Pin data carries the trigger's output; the execution stack just marks where to start.
	 */
	private buildExecutionData(startNode: INode, pinData: IPinData): IRunExecutionData {
		return createRunExecutionData({
			startData: {},
			resultData: { pinData, runData: {} },
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [
					{
						node: startNode,
						data: { main: [[{ json: {} }]] },
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

	// ── Request interception ─────────────────────────────────────────────

	/**
	 * Wraps the mock handler to collect intercepted request metadata for diagnostics.
	 */
	private createInterceptingHandler(
		mockHandler: EvalLlmMockHandler,
		nodeResults: Record<string, InstanceAiEvalNodeResult>,
	): EvalLlmMockHandler {
		return async (
			requestOptions: IHttpRequestOptions,
			node: INode,
		): Promise<EvalMockHttpResponse | undefined> => {
			// A node may make multiple HTTP requests — ensure it's marked as mocked.
			// checkNodeConfig may have pre-created the entry as 'real', so always override.
			const entry = (nodeResults[node.name] ??= {
				output: null,
				interceptedRequests: [],
				executionMode: 'mocked',
			});
			entry.executionMode = 'mocked';
			const response = await mockHandler(requestOptions, node);

			entry.interceptedRequests.push({
				url: requestOptions.url,
				method: requestOptions.method ?? 'GET',
				nodeType: node.type,
				requestBody: requestOptions.body,
				mockResponse: response?.body,
			});

			this.logger.debug(
				`[EvalMock] Intercepted ${requestOptions.method ?? 'GET'} ${requestOptions.url} from "${node.name}" (${node.type})`,
			);

			return response;
		};
	}

	// ── Result extraction ─────────────────────────────────────────────────

	private buildResult(
		executionId: string,
		result: IRun,
		nodeResults: Record<string, InstanceAiEvalNodeResult>,
		hints: MockHints,
	): InstanceAiEvalExecutionResult {
		const errors: string[] = [];

		const runData = result.data?.resultData?.runData ?? {};
		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			// Nodes already in nodeResults were intercepted (mocked) or pinned.
			// Nodes appearing here for the first time executed for real (logic nodes).
			const entry = (nodeResults[nodeName] ??= {
				output: null,
				interceptedRequests: [],
				executionMode: 'real',
			});
			const lastRun = nodeRuns[nodeRuns.length - 1];
			if (lastRun?.startTime) {
				entry.startTime = lastRun.startTime;
			}
			if (lastRun?.data?.main) {
				// Capture output from all branches (Switch/IF nodes have multiple outputs)
				const allOutputs = lastRun.data.main
					.flat()
					.filter(Boolean)
					.slice(0, MAX_OUTPUT_ITEMS_PER_NODE);
				if (allOutputs.length > 0) {
					entry.output = allOutputs;
				}
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
			hints,
		};
	}

	private errorResult(executionId: string, message: string): InstanceAiEvalExecutionResult {
		return {
			executionId,
			success: false,
			nodeResults: {},
			errors: [message],
			hints: {
				globalContext: '',
				triggerContent: {},
				nodeHints: {},
				warnings: [],
				bypassPinData: {},
			},
		};
	}
}
