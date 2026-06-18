import {
	EVAL_VENDOR_SDK_INTERCEPTION_FLAG,
	type InstanceAiEvalExecutionRequest,
	type InstanceAiEvalNodeResult,
	type InstanceAiEvalExecutionResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { normalizePinData } from '@n8n/workflow-sdk';
import {
	BinaryDataService,
	type EvalLlmMockHandler,
	type EvalMockHttpResponse,
	synthesizeBinaryFixture,
} from 'n8n-core';
import {
	type IBinaryData,
	type IBinaryKeyData,
	type IDataObject,
	type IHttpRequestOptions,
	type INode,
	type INodeExecutionData,
	type INodeParameters,
	type IPinData,
	type IRun,
	type IRunExecutionData,
	type IWorkflowBase,
	type IWorkflowExecuteAdditionalData,
	type IWorkflowExecutionDataProcess,
	createRunExecutionData,
	fileTypeFromMimeType,
	NodeHelpers,
	UserError,
	Workflow,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { ActiveExecutions } from '@/active-executions';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { EvalMockedCredentialsHelper } from './eval-mocked-credentials-helper';
import { type InterceptedTurn, LlmWireServer } from './llm-wire-server';
import { createLlmMockHandler } from './mock-handler';
import { generatePinData } from './pin-data-generator';
import { patchNoProxyForLoopback } from './proxy-loopback';
import {
	buildVendorLlmRouting,
	detectBinaryDependencies,
	generateMockHints,
	identifyNodesForHints,
	identifyNodesForPinData,
	type MockHints,
	partitionAiRoots,
	type TriggerBinaryRequirement,
	type VendorLlmRouting,
} from './workflow-analysis';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max output items per branch kept in the artifact. The full count lives in `outputCount`. */
const MAX_OUTPUT_ITEMS_PER_BRANCH = 10;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

// Executes workflows with LLM-based HTTP mocking. Phase 1 generates per-node
// mock hints (one LLM call); Phase 2 runs the workflow with a per-execution
// mock handler — additionalData is fresh, no global state mutated.
@Service()
export class EvalExecutionService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
		private readonly postHogClient: PostHogClient,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly binaryDataService: BinaryDataService,
	) {}

	async executeWithLlmMock(
		workflowId: string,
		user: User,
		options: InstanceAiEvalExecutionRequest = {},
	): Promise<InstanceAiEvalExecutionResult> {
		// Eval routes through WorkflowRunner with a configureAdditionalData closure
		// that doesn't survive queue serialization. Refuse upfront so vendor calls
		// can never leak to real providers from a worker that never wires the mock.
		if (this.executionsConfig.mode === 'queue') {
			return this.errorResult(
				randomUUID(),
				'Eval execution requires main process mode — queue mode is not supported.',
			);
		}

		// Retry transient lookup misses from concurrent eval runs.
		let workflowEntity = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:execute',
		]);
		if (!workflowEntity) {
			for (const delayMs of [200, 500, 1000]) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				workflowEntity = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:execute',
				]);
				if (workflowEntity) break;
			}
		}

		if (!workflowEntity) {
			return this.errorResult(randomUUID(), `Workflow ${workflowId} not found or not accessible`);
		}

		// Partition AI roots into "intercept via wire server" vs "leave pinned".
		// Default-on: every root with compatible sub-nodes gets intercepted;
		// callers can opt specific roots out via `pinNodes` (e.g. for A/B
		// comparison). Roots whose sub-nodes are incompatible auto-pin.
		let partitioned: ReturnType<typeof partitionAiRoots>;
		try {
			partitioned = partitionAiRoots(workflowEntity, options.pinNodes ?? []);
		} catch (error) {
			if (error instanceof UserError) {
				return this.errorResult(randomUUID(), error.message);
			}
			throw error;
		}

		for (const entry of partitioned.autoPinned) {
			this.logger.debug(
				`[EvalMock] Auto-pinning AI root "${entry.root}" — sub-node "${entry.subNode}" (${entry.subNodeType}) is ${entry.reason}`,
			);
		}

		// Kill-switch: when interception is disabled, every root falls back to
		// the pinned path regardless of partition or explicit `pinNodes`.
		let interceptionEnabled = false;
		let unpinNodes = partitioned.unpinNodes;
		if (unpinNodes.length > 0) {
			interceptionEnabled = await this.isInterceptionEnabled(user);
			if (!interceptionEnabled) {
				this.logger.warn(
					'[EvalMock] Vendor SDK interception disabled by kill-switch — pinning all AI roots',
				);
				unpinNodes = [];
			}
		}

		const unpinSet = unpinNodes.length > 0 ? new Set(unpinNodes) : undefined;
		const hints = await this.analyzeWorkflow(workflowEntity, options.scenarioHints, unpinSet);
		const vendorLlmRouting = interceptionEnabled
			? buildVendorLlmRouting(workflowEntity, unpinNodes)
			: undefined;

		return await this.execute(
			workflowEntity,
			user,
			hints,
			options.scenarioHints,
			interceptionEnabled,
			vendorLlmRouting,
		);
	}

	// Default-on kill-switch: unset → enabled, explicit `false` → disabled, resolution error → disabled.
	private async isInterceptionEnabled(user: User): Promise<boolean> {
		try {
			const flags = await this.postHogClient.getFeatureFlags(user);
			return flags?.[EVAL_VENDOR_SDK_INTERCEPTION_FLAG] !== false;
		} catch (error) {
			this.logger.warn('[EvalMock] Failed to resolve vendor-SDK interception flag', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	// ── Phase 1: Workflow analysis ─────────────────────────────────────────

	private async analyzeWorkflow(
		workflowEntity: IWorkflowBase,
		scenarioHints?: string,
		unpinSet?: Set<string>,
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
		const bypassNodes = identifyNodesForPinData(workflowEntity, unpinSet);
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
		hints: MockHints,
		scenarioHints?: string,
		interceptionEnabled = false,
		vendorLlmRouting?: VendorLlmRouting,
	): Promise<InstanceAiEvalExecutionResult> {
		const nodeResults: Record<string, InstanceAiEvalNodeResult> = {};

		const workflow = this.buildWorkflow(workflowEntity);
		const startNode = this.findStartNode(workflow);

		if (!startNode) {
			return this.errorResult(randomUUID(), 'No trigger or start node found in the workflow');
		}

		const mockHandler = createLlmMockHandler({
			scenarioHints,
			globalContext: hints.globalContext,
			nodeHints: hints.nodeHints,
		});

		const binaryRequirement = detectBinaryDependencies(workflowEntity);
		const triggerPinData = this.buildTriggerPinData(
			startNode,
			hints.triggerContent,
			binaryRequirement,
		);
		const pinData: IPinData = { ...triggerPinData, ...hints.bypassPinData };
		const pinDataNodeNames = Object.keys(pinData);

		// Check config completeness before execution — detect missing required parameters
		this.checkNodeConfig(workflow, nodeResults, pinDataNodeNames);
		this.patchParameterIssuesForEval(workflow, pinDataNodeNames);
		const executionData = this.buildExecutionData(startNode, pinData);

		// Mark the trigger node as pinned (it gets its output from pin data, not execution).
		if (Object.keys(triggerPinData).length > 0) {
			this.markNodeAsPinned(startNode.name, nodeResults);
		}
		for (const nodeName of Object.keys(hints.bypassPinData)) {
			this.markNodeAsPinned(nodeName, nodeResults);
		}

		// try/finally wraps boot so a throw never leaks the server or NO_PROXY patch.
		let wireServer: LlmWireServer | undefined;
		let restoreNoProxy: (() => void) | undefined;
		let credentialsHelper: EvalMockedCredentialsHelper | undefined;
		let dbExecutionId: string | undefined;

		try {
			let serverUrl: string | undefined;
			if (interceptionEnabled) {
				wireServer = new LlmWireServer({
					mockHandler,
					rootToSubNode: vendorLlmRouting?.rootToSubNode,
					onIntercept: (turn) => this.recordWireServerTurn(turn, nodeResults),
					logger: this.logger,
				});
				serverUrl = await wireServer.start();
				restoreNoProxy = patchNoProxyForLoopback();
				this.logger.debug(`[EvalMock] Wire server listening at ${serverUrl}`);
			}

			const runData: IWorkflowExecutionDataProcess = {
				executionMode: 'evaluation',
				workflowData: workflowEntity,
				userId: user.id,
				executionData,
				pinData,
				configureAdditionalData: (additionalData: IWorkflowExecuteAdditionalData) => {
					credentialsHelper = new EvalMockedCredentialsHelper(
						additionalData.credentialsHelper,
						serverUrl,
						this.logger,
						vendorLlmRouting?.subNodeToRoot,
					);
					additionalData.credentialsHelper = credentialsHelper;
					additionalData.evalLlmMockHandler = this.createInterceptingHandler(
						mockHandler,
						nodeResults,
					);
				},
			};

			dbExecutionId = await this.workflowRunner.run(runData);
			const runResult = await this.activeExecutions.getPostExecutePromise(dbExecutionId);

			if (!runResult) {
				return this.buildPartialFailureResult(
					dbExecutionId,
					new Error('Execution finished with no run data'),
					nodeResults,
					hints,
					credentialsHelper,
				);
			}

			return await this.buildResult(
				dbExecutionId,
				runResult,
				nodeResults,
				hints,
				credentialsHelper,
			);
		} catch (error: unknown) {
			return this.buildPartialFailureResult(
				dbExecutionId ?? randomUUID(),
				error,
				nodeResults,
				hints,
				credentialsHelper,
			);
		} finally {
			if (restoreNoProxy) restoreNoProxy();
			if (wireServer) {
				try {
					await wireServer.stop();
				} catch (error) {
					this.logger.warn('[EvalMock] Wire server teardown failed', {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
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
					outputs: {},
					outputCount: 0,
					iterationCount: 0,
					interceptedRequests: [],
					executionMode: 'real',
				});
				entry.configIssues = issues.parameters;
			}
		}
	}

	/**
	 * Keep recorded config issues, but patch eval-only placeholders and empty
	 * params so one incomplete node does not stop the entire mocked execution.
	 */
	private patchParameterIssuesForEval(workflow: Workflow, pinDataNodeNames: string[]): void {
		for (const node of Object.values(workflow.nodes)) {
			if (node.disabled) continue;
			if (pinDataNodeNames.includes(node.name)) continue;

			if (node.parameters) {
				node.parameters = scrubPlaceholderValues(node.parameters) as INodeParameters;
			}

			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			if (!nodeType) continue;

			const issues = NodeHelpers.getNodeParametersIssues(
				nodeType.description.properties,
				node,
				nodeType.description,
				pinDataNodeNames,
			);

			const paramIssues = issues?.parameters;
			if (!paramIssues || Object.keys(paramIssues).length === 0) continue;

			const params = node.parameters ?? {};
			for (const paramName of Object.keys(paramIssues)) {
				params[paramName] = synthesizeMissingParamValue(
					params[paramName],
				) as INodeParameters[string];
			}
			node.parameters = params;
		}
	}

	// ── Execution data ────────────────────────────────────────────────────

	/**
	 * Build pin data for the trigger/start node from LLM-generated content.
	 * Pin data provides the trigger's output — the node doesn't execute,
	 * since trigger nodes receive external events that don't fire in eval mode.
	 */
	private buildTriggerPinData(
		startNode: INode,
		triggerContent: Record<string, unknown>,
		binaryRequirement?: TriggerBinaryRequirement,
	): IPinData {
		if (Object.keys(triggerContent).length === 0 && !binaryRequirement) return {};

		// Mirror any LLM-embedded binary map as real item-level binary; json stays
		// untouched so $json.binary.* references keep resolving.
		const embedded = readEmbeddedBinaryMeta(triggerContent);
		const item: INodeExecutionData = { json: triggerContent as IDataObject };
		const binary: IBinaryKeyData = {};

		if (binaryRequirement) {
			// Requirement wins for its key, except embedded meta beats the generic fallback.
			const embeddedMeta = embedded[binaryRequirement.propertyName];
			const isGenericFallback =
				binaryRequirement.contentType === 'application/octet-stream' &&
				binaryRequirement.filename === 'input.bin';
			binary[binaryRequirement.propertyName] = synthesizeBinaryEntry(
				(isGenericFallback && embeddedMeta?.mimeType) || binaryRequirement.contentType,
				(isGenericFallback && embeddedMeta?.fileName) || binaryRequirement.filename,
			);
		}

		for (const [key, meta] of Object.entries(embedded)) {
			if (binary[key]) continue;
			binary[key] = synthesizeBinaryEntry(
				meta.mimeType ?? 'application/octet-stream',
				meta.fileName ?? 'input.bin',
			);
		}

		if (Object.keys(binary).length > 0) item.binary = binary;

		return { [startNode.name]: [item] };
	}

	/**
	 * Build execution data with the trigger node on the execution stack so
	 * webhook-style triggers (which don't define `trigger`) get a known start.
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

	// ── Request interception ─────────────────────────────────────────────

	/**
	 * Record a wire-server model turn against the AI root in `nodeResults`.
	 * Attribution mirrors `createInterceptingHandler` so vendor-SDK traffic
	 * and HTTP-helper traffic land in the same ledger shape — downstream
	 * consumers (eval UI, graders) don't need to special-case the two.
	 */
	private recordWireServerTurn(
		turn: InterceptedTurn,
		nodeResults: Record<string, InstanceAiEvalNodeResult>,
	): void {
		const entry = (nodeResults[turn.rootName] ??= {
			outputs: {},
			outputCount: 0,
			iterationCount: 0,
			interceptedRequests: [],
			executionMode: 'mocked',
		});
		// Preserve a pre-set 'pinned' (bypass pass owns that classification);
		// otherwise the turn IS mocked, so upgrade from any other prior value
		// (e.g. 'real' from checkNodeConfig() pre-marking config-issue nodes).
		if (entry.executionMode !== 'pinned') {
			entry.executionMode = 'mocked';
		}
		entry.interceptedRequests.push({
			url: turn.url,
			method: turn.method,
			nodeType: turn.nodeType,
			requestBody: turn.requestBody,
			mockResponse: turn.mockResponse,
		});

		this.logger.debug(
			`[EvalMock] Wire server intercepted ${turn.method} ${turn.url} attributed to root "${turn.rootName}"`,
		);
	}

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
				outputs: {},
				outputCount: 0,
				iterationCount: 0,
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

	/**
	 * Mark a node entry as pinned, preserving any config issues that
	 * `checkNodeConfig` may have already recorded on it. Used both for the
	 * trigger node (which receives its output from `triggerPinData`) and for
	 * each bypass node — the shape of the entry is identical, just the trigger
	 * is gated by the trigger-has-content branch above.
	 */
	private markNodeAsPinned(
		nodeName: string,
		nodeResults: Record<string, InstanceAiEvalNodeResult>,
	): void {
		const existing = nodeResults[nodeName];
		nodeResults[nodeName] = {
			outputs: {},
			outputCount: 0,
			iterationCount: 0,
			interceptedRequests: [],
			executionMode: 'pinned',
			...(existing?.configIssues ? { configIssues: existing.configIssues } : {}),
		};
	}

	/**
	 * Build the failure result returned when execution threw partway through —
	 * preserves the accumulated `nodeResults`, `hints`, and credential
	 * diagnostics rather than discarding them like `errorResult` does. Lifted
	 * out of the `execute()` catch block so the inline expression count there
	 * stays within complexity bounds.
	 */
	private buildPartialFailureResult(
		executionId: string,
		error: unknown,
		nodeResults: Record<string, InstanceAiEvalNodeResult>,
		hints: MockHints,
		credentialsHelper: EvalMockedCredentialsHelper | undefined,
	): InstanceAiEvalExecutionResult {
		const message = error instanceof Error ? error.message : String(error);
		this.logger.error(`[EvalMock] Workflow execution failed: ${message}`);
		return {
			executionId,
			success: false,
			nodeResults,
			errors: [`Execution failed: ${message}`],
			hints,
			mockedCredentials: credentialsHelper?.mockedCredentials ?? [],
			rewrittenCredentials: credentialsHelper?.rewrittenCredentials ?? [],
		};
	}

	// ── Result extraction ─────────────────────────────────────────────────

	/**
	 * When binary data storage is filesystem/s3/db, `binary.<key>.data` is the
	 * mode marker (e.g. `'filesystem-v2'`) and the actual bytes live behind
	 * `binary.<key>.id`. Verifiers compare against the base64 payload, so read
	 * the stored bytes back and inline them on a shallow copy.
	 */
	private async hydrateBinaryData(items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
		return await Promise.all(
			items.map(async (item) => {
				if (!item.binary) return item;
				const hydratedBinary: IBinaryKeyData = {};
				for (const [key, entry] of Object.entries(item.binary)) {
					if (entry.id) {
						try {
							const buffer = await this.binaryDataService.getAsBuffer(entry);
							hydratedBinary[key] = { ...entry, data: buffer.toString('base64') };
							continue;
						} catch (error) {
							this.logger.warn(
								`[EvalMock] Failed to hydrate binary "${key}" (${entry.id}): ${error instanceof Error ? error.message : String(error)}`,
							);
						}
					}
					hydratedBinary[key] = entry;
				}
				return { ...item, binary: hydratedBinary };
			}),
		);
	}

	private async buildResult(
		executionId: string,
		result: IRun,
		nodeResults: Record<string, InstanceAiEvalNodeResult>,
		hints: MockHints,
		credentialsHelper: EvalMockedCredentialsHelper | undefined,
	): Promise<InstanceAiEvalExecutionResult> {
		const errors: string[] = [];

		const runData = result.data?.resultData?.runData ?? {};
		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			// Nodes already in nodeResults were intercepted (mocked) or pinned.
			// Nodes appearing here for the first time executed for real (logic nodes).
			const entry = (nodeResults[nodeName] ??= {
				outputs: {},
				outputCount: 0,
				iterationCount: 0,
				interceptedRequests: [],
				executionMode: 'real',
			});
			entry.iterationCount = nodeRuns.length;
			const firstErrorIdx = nodeRuns.findIndex((run) => run?.error !== undefined);
			if (firstErrorIdx !== -1) {
				entry.firstErrorIteration = firstErrorIdx;
			}

			const lastRun = nodeRuns[nodeRuns.length - 1];
			if (lastRun?.startTime) {
				entry.startTime = lastRun.startTime;
			}
			if (lastRun?.data) {
				// Preserve per-connection-type, per-output-port structure so verifiers can
				// distinguish Filter/IF/Switch branches and AI sub-node outputs.
				let totalCount = 0;
				let truncated = false;
				const outputs: Record<string, unknown[][]> = {};
				for (const [connectionType, branches] of Object.entries(lastRun.data)) {
					if (!Array.isArray(branches)) continue;
					outputs[connectionType] = await Promise.all(
						branches.map(async (branch) => {
							if (!Array.isArray(branch)) return [];
							totalCount += branch.length;
							let kept = branch;
							if (branch.length > MAX_OUTPUT_ITEMS_PER_BRANCH) {
								truncated = true;
								kept = branch.slice(0, MAX_OUTPUT_ITEMS_PER_BRANCH);
							}
							return await this.hydrateBinaryData(kept);
						}),
					);
				}
				entry.outputs = outputs;
				entry.outputCount = totalCount;
				if (truncated) entry.truncated = true;
			}
			if (lastRun?.error) {
				errors.push(`Node "${nodeName}": ${lastRun.error.message}`);
			}
		}

		const executionError = result.data?.resultData?.error;
		if (executionError) {
			errors.push(`Workflow error: ${executionError.message}`);
		}
		const configIssueErrors = collectConfigIssueErrors(nodeResults);
		const allErrors = [...errors, ...configIssueErrors];

		return {
			executionId,
			success: allErrors.length === 0,
			nodeResults,
			errors: allErrors,
			hints,
			mockedCredentials: credentialsHelper?.mockedCredentials ?? [],
			rewrittenCredentials: credentialsHelper?.rewrittenCredentials ?? [],
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
			mockedCredentials: [],
			rewrittenCredentials: [],
		};
	}
}

/** Synthesize a structurally valid binary entry (real bytes, base64-inlined). */
function synthesizeBinaryEntry(contentType: string, filename: string): IBinaryData {
	const bytes = synthesizeBinaryFixture(contentType, filename);
	const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.') + 1) : 'bin';
	return {
		mimeType: contentType,
		fileName: filename,
		fileExtension: extension,
		fileType: fileTypeFromMimeType(contentType.toLowerCase()),
		data: bytes.toString('base64'),
	};
}

interface EmbeddedBinaryMeta {
	mimeType?: string;
	fileName?: string;
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/**
 * Read an LLM-embedded binary map from the trigger json. Qualifies only when
 * EVERY entry under a top-level `binary` key carries real file metadata
 * (mime type or file name — a bare `name` alone doesn't count).
 */
function readEmbeddedBinaryMeta(
	triggerContent: Record<string, unknown>,
): Record<string, EmbeddedBinaryMeta> {
	const candidate = triggerContent.binary;
	if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
		return {};
	}

	const entries = Object.entries(candidate as Record<string, unknown>);
	if (entries.length === 0) return {};

	const embedded: Record<string, EmbeddedBinaryMeta> = {};
	for (const [key, value] of entries) {
		if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
		const v = value as Record<string, unknown>;
		const mimeType =
			nonEmptyString(v.mimeType) ?? nonEmptyString(v.mimetype) ?? nonEmptyString(v.contentType);
		const strictFileName = nonEmptyString(v.fileName) ?? nonEmptyString(v.filename);
		if (!mimeType && !strictFileName) return {};
		embedded[key] = {
			mimeType,
			// `name` is a fileName fallback, not qualification evidence.
			fileName: strictFileName ?? nonEmptyString(v.name),
		};
	}

	return embedded;
}

const PLACEHOLDER_PREFIX = '<__PLACEHOLDER_VALUE__';
const PLACEHOLDER_SUFFIX = '__>';

function synthesizePlaceholderValue(hint: string): string {
	const h = hint.toLowerCase();
	if (h.includes('email')) return 'eval-mock@example.com';
	if (h.includes('url') || h.includes('endpoint') || h.includes('webhook')) {
		return 'https://eval-mock.invalid/';
	}
	if (h.includes('phone')) return '+10000000000';
	if (h.includes('slack channel') || h.includes('channel')) return 'C00000000EVAL';
	if (h.includes('chat') && h.includes('id')) return '100000000';
	if (h.includes('telegram')) return '100000000';
	const selectedResourceValue = synthesizeSelectedResourcePlaceholderValue(h);
	if (selectedResourceValue) return selectedResourceValue;
	return '__evalMockValue';
}

function synthesizeSelectedResourcePlaceholderValue(hint: string): string | undefined {
	if (!hint.includes('select')) return undefined;
	if (hint.includes('spreadsheet') || hint.includes('document')) return 'eval-spreadsheet-id';
	if (hint.includes('sheet')) return '0';
	if (hint.includes('calendar')) return 'eval-calendar-id';
	if (hint.includes('folder')) return 'eval-folder-id';
	if (hint.includes('file')) return 'eval-file-id';
	if (hint.includes('drive')) return 'eval-drive-id';
	return undefined;
}

function scrubPlaceholderValues(value: unknown): unknown {
	if (typeof value === 'string') {
		if (!value.startsWith(PLACEHOLDER_PREFIX) || !value.endsWith(PLACEHOLDER_SUFFIX)) {
			return value;
		}
		const hint = value.slice(PLACEHOLDER_PREFIX.length, -PLACEHOLDER_SUFFIX.length);
		return synthesizePlaceholderValue(hint);
	}
	if (Array.isArray(value)) return value.map(scrubPlaceholderValues);
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			out[key] = scrubPlaceholderValues(child);
		}
		return out;
	}
	return value;
}

function synthesizeMissingParamValue(current: unknown): unknown {
	if (
		current !== null &&
		typeof current === 'object' &&
		!Array.isArray(current) &&
		'__rl' in (current as Record<string, unknown>)
	) {
		const rl = current as Record<string, unknown>;
		const mode = typeof rl.mode === 'string' && rl.mode.length > 0 ? rl.mode : 'id';
		const rawValue = rl.value;
		const hasValue =
			(typeof rawValue === 'string' && rawValue.length > 0) ||
			(typeof rawValue === 'number' && Number.isFinite(rawValue));
		return {
			...rl,
			mode,
			value: hasValue ? rawValue : '__evalMockResource',
		};
	}

	if (typeof current === 'string' && current.length === 0) return '__evalMockValue';
	if (current === null || current === undefined) return '__evalMockValue';

	return current;
}

function collectConfigIssueErrors(nodeResults: Record<string, InstanceAiEvalNodeResult>): string[] {
	const errors: string[] = [];
	for (const [nodeName, result] of Object.entries(nodeResults)) {
		const issues = result.configIssues;
		if (!issues || Object.keys(issues).length === 0) continue;
		const issueMessages = Object.values(issues).flat();
		if (issueMessages.length === 0) continue;
		errors.push(
			`Node "${nodeName}" has missing or invalid configuration: ${issueMessages.join('; ')}`,
		);
	}
	return errors;
}
