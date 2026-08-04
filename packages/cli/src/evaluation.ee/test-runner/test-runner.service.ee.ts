import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import type { EvaluationConfig, User } from '@n8n/db';
import {
	EvaluationCollectionRepository,
	EvaluationConfigRepository,
	TestCaseExecutionErrorCode,
	TestCaseExecutionRepository,
	TestRun,
	TestRunErrorCode,
	TestRunRepository,
	WorkflowRepository,
} from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import {
	EVALUATION_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	ExecutionCancelledError,
	NodeConnectionTypes,
	metricRequiresModelConnection,
	DEFAULT_EVALUATION_METRIC,
	ManualExecutionCancelledError,
	createRunExecutionData,
} from 'n8n-workflow';
import type {
	IDataObject,
	IRun,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	INodeExecutionData,
	AssignmentCollectionValue,
	GenericValue,
	JsonObject,
} from 'n8n-workflow';
import assert from 'node:assert';
import pLimit from 'p-limit';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import {
	getEvaluationConcurrencyLimitSource,
	resolveEvaluationConcurrencyLimit,
} from '@/evaluation.ee/evaluation-concurrency.helper';
import { TestCaseExecutionError, TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import {
	checkNodeParameterNotEmpty,
	extractTokenUsage,
} from '@/evaluation.ee/test-runner/utils.ee';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { getWorkflowProjectDetailsSafe } from '@/workflows/utils';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { EvaluationMetrics, type MetricContribution } from './evaluation-metrics.ee';
import { WorkflowCompilerService } from './workflow-compiler.service';

export interface TestRunMetadata {
	testRunId: string;
	userId: string;
}

export interface TestCaseExecutionResult {
	executionData: IRun;
	executionId: string;
}

/**
 * Orchestrates evaluation runs: a partial execution of the eval trigger fetches
 * the dataset, each test case is run through the workflow, metrics are collected
 * per case, then aggregated and saved.
 */
@Service()
export class TestRunnerService {
	private abortControllers: Map<TestRun['id'], AbortController> = new Map();

	constructor(
		private readonly logger: Logger,
		private readonly telemetry: Telemetry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly testRunRepository: TestRunRepository,
		private readonly testCaseExecutionRepository: TestCaseExecutionRepository,
		private readonly errorReporter: ErrorReporter,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly eventService: EventService,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly concurrencyControlService: ConcurrencyControlService,
		private readonly license: License,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly evaluationCollectionRepository: EvaluationCollectionRepository,
		private readonly evaluationConfigRepository: EvaluationConfigRepository,
		private readonly workflowCompiler: WorkflowCompilerService,
		private readonly ownershipService: OwnershipService,
	) {}

	private findEvaluationTriggerNode(workflow: IWorkflowBase) {
		return workflow.nodes.find((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE);
	}

	/** Validates the evaluation trigger node is present and configured. */
	private validateEvaluationTriggerNode(workflow: IWorkflowBase) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		if (!triggerNode) {
			throw new TestRunError(TestRunErrorCode.EVALUATION_TRIGGER_NOT_FOUND);
		}

		const { parameters, credentials, name, typeVersion } = triggerNode;
		const source = parameters?.source
			? (parameters.source as string)
			: typeVersion >= 4.7
				? 'dataTable'
				: 'googleSheets';

		const isConfigured =
			source === 'dataTable'
				? checkNodeParameterNotEmpty(parameters?.dataTableId)
				: !!credentials &&
					checkNodeParameterNotEmpty(parameters?.documentId) &&
					checkNodeParameterNotEmpty(parameters?.sheetName);

		if (!isConfigured) {
			throw new TestRunError(TestRunErrorCode.EVALUATION_TRIGGER_NOT_CONFIGURED, {
				node_name: name,
			});
		}

		if (triggerNode?.disabled) {
			throw new TestRunError(TestRunErrorCode.EVALUATION_TRIGGER_DISABLED);
		}
	}

	private hasModelNodeConnected(workflow: IWorkflowBase, targetNodeName: string): boolean {
		// True if a node connects to the target via the ai_languageModel type.
		return Object.keys(workflow.connections).some((sourceNodeName) => {
			const connections = workflow.connections[sourceNodeName];
			return connections?.[NodeConnectionTypes.AiLanguageModel]?.[0]?.some(
				(connection) => connection.node === targetNodeName,
			);
		});
	}

	private validateSetMetricsNodes(workflow: IWorkflowBase) {
		const metricsNodes = TestRunnerService.getEvaluationMetricsNodes(workflow);
		if (metricsNodes.length === 0) {
			throw new TestRunError(TestRunErrorCode.SET_METRICS_NODE_NOT_FOUND);
		}

		const unconfiguredMetricsNode = metricsNodes.find((node) => {
			if (node.disabled === true || !node.parameters) {
				return true;
			}

			// customMetrics mode: explicit on 4.7+, the default below 4.7.
			const isCustomMetricsMode =
				node.typeVersion >= 4.7 ? node.parameters.metric === 'customMetrics' : true;

			if (isCustomMetricsMode) {
				return (
					!node.parameters.metrics ||
					(node.parameters.metrics as AssignmentCollectionValue).assignments?.length === 0 ||
					(node.parameters.metrics as AssignmentCollectionValue).assignments?.some(
						(assignment) => !assignment.name || assignment.value === null,
					)
				);
			}

			// For version 4.7+, check if AI-based metrics require model connection
			if (node.typeVersion >= 4.7) {
				const metric = (node.parameters.metric ?? DEFAULT_EVALUATION_METRIC) as string;
				if (
					metricRequiresModelConnection(metric) && // See packages/workflow/src/evaluation-helpers.ts
					!this.hasModelNodeConnected(workflow, node.name)
				) {
					return true;
				}
			}

			return false;
		});

		if (unconfiguredMetricsNode) {
			throw new TestRunError(TestRunErrorCode.SET_METRICS_NODE_NOT_CONFIGURED, {
				node_name: unconfiguredMetricsNode.name,
			});
		}
	}

	/** Validates any Evaluation Set Outputs nodes are configured. */
	private validateSetOutputsNodes(workflow: IWorkflowBase) {
		const setOutputsNodes = TestRunnerService.getEvaluationSetOutputsNodes(workflow);
		if (setOutputsNodes.length === 0) {
			return; // No outputs nodes are strictly required, so we can skip validation
		}

		const unconfiguredSetOutputsNode = setOutputsNodes.find(
			(node) =>
				!node.parameters ||
				!node.parameters.outputs ||
				(node.parameters.outputs as AssignmentCollectionValue).assignments?.length === 0 ||
				(node.parameters.outputs as AssignmentCollectionValue).assignments?.some(
					(assignment) => !assignment.name || assignment.value === null,
				),
		);

		if (unconfiguredSetOutputsNode) {
			throw new TestRunError(TestRunErrorCode.SET_OUTPUTS_NODE_NOT_CONFIGURED, {
				node_name: unconfiguredSetOutputsNode.name,
			});
		}
	}

	/** Validates workflow configuration for evaluation; throws TestRunError on failure. */
	private validateWorkflowConfiguration(workflow: IWorkflowBase): void {
		this.validateEvaluationTriggerNode(workflow);

		this.validateSetOutputsNodes(workflow);

		this.validateSetMetricsNodes(workflow);
	}

	/**
	 * Runs one test case: injects the input as the eval trigger's pinned data and
	 * waits for the workflow to finish.
	 */
	private async runTestCase(
		workflow: IWorkflowBase,
		metadata: TestRunMetadata,
		testCase: INodeExecutionData,
		abortSignal: AbortSignal,
	): Promise<TestCaseExecutionResult | undefined> {
		if (abortSignal.aborted) {
			return;
		}

		// Run like a manual execution — evaluation needs pinned data and partial
		// execution logic.
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		assert(triggerNode);

		const pinData = {
			[triggerNode.name]: [testCase],
		};

		const data: IWorkflowExecutionDataProcess = {
			executionMode: 'evaluation',
			pinData,
			forceFullExecutionData: true,
			workflowData: {
				...workflow,
				settings: {
					...workflow.settings,
					saveManualExecutions: true,
					saveDataErrorExecution: 'all',
					saveDataSuccessExecution: 'all',
					saveExecutionProgress: false,
				},
			},
			userId: metadata.userId,
			evaluationRunId: metadata.testRunId,
			triggerToStartFrom: {
				name: triggerNode.name,
			},
		};

		// Queue mode needs the same additional data manual mode would pass.
		if (this.executionsConfig.mode === 'queue') {
			data.executionData = createRunExecutionData({
				executionData: null,
				resultData: {
					pinData,
				},
				manualData: {
					userId: metadata.userId,
					evaluationRunId: metadata.testRunId,
					triggerToStartFrom: {
						name: triggerNode.name,
					},
				},
			});
		}

		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		const { projectId, projectName } = await getWorkflowProjectDetailsSafe(
			this.ownershipService,
			workflow.id,
		);

		this.eventService.emit('workflow-executed', {
			user: metadata.userId ? { id: metadata.userId } : undefined,
			workflowId: workflow.id,
			workflowName: workflow.name,
			executionId,
			projectId,
			projectName,
			source: 'evaluation',
		});

		abortSignal.addEventListener('abort', () => {
			this.activeExecutions.stopExecution(
				executionId,
				new ManualExecutionCancelledError(executionId),
			);
		});

		const executionData = await this.activeExecutions.getPostExecutePromise(executionId);

		assert(executionData);

		return { executionId, executionData };
	}

	/** Partial execution of just the dataset trigger, to fetch the whole dataset. */
	private async runDatasetTrigger(workflow: IWorkflowBase, metadata: TestRunMetadata) {
		// Run like a manual execution — evaluation needs pinned data and partial
		// execution logic.
		const triggerNode = this.findEvaluationTriggerNode(workflow);

		if (!triggerNode) {
			throw new TestRunError(TestRunErrorCode.EVALUATION_TRIGGER_NOT_FOUND);
		}

		// Call custom operation to fetch the whole dataset
		triggerNode.forceCustomOperation = {
			resource: 'dataset',
			operation: 'getRows',
		};

		const data: IWorkflowExecutionDataProcess = {
			destinationNode: { nodeName: triggerNode.name, mode: 'inclusive' },
			executionMode: 'manual',
			runData: {},
			forceFullExecutionData: true,
			workflowData: {
				...workflow,
				settings: {
					...workflow.settings,
					saveManualExecutions: false,
					saveDataErrorExecution: 'none',
					saveDataSuccessExecution: 'none',
					saveExecutionProgress: false,
				},
			},
			userId: metadata.userId,
			executionData: createRunExecutionData({
				startData: {
					destinationNode: { nodeName: triggerNode.name, mode: 'inclusive' },
				},
				manualData: {
					userId: metadata.userId,
					triggerToStartFrom: {
						name: triggerNode.name,
					},
				},
				executionData: {
					nodeExecutionStack: [
						{ node: triggerNode, data: { main: [[{ json: {} }]] }, source: null },
					],
				},
			}),
			triggerToStartFrom: {
				name: triggerNode.name,
			},
		};

		const offloadingManualExecutionsInQueueMode =
			this.executionsConfig.mode === 'queue' &&
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true';

		if (offloadingManualExecutionsInQueueMode) {
			// Offloading to workers fails if executionData.executionData is present,
			// so drop just that nested field (keep startData/manualData).
			// @ts-expect-error - Removing nested executionData property for queue mode
			delete data.executionData.executionData;
		}

		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

		return await executePromise;
	}

	/** Get the enabled evaluation nodes for the given operation. */
	static getEvaluationNodes(
		workflow: IWorkflowBase,
		operation: 'setMetrics' | 'setOutputs' | 'setInputs',
		{ isDefaultOperation }: { isDefaultOperation: boolean } = { isDefaultOperation: false },
	) {
		return workflow.nodes.filter(
			(node) =>
				node.type === EVALUATION_NODE_TYPE &&
				node.disabled !== true &&
				(node.parameters.operation === operation ||
					(isDefaultOperation && node.parameters.operation === undefined)),
		);
	}

	static getEvaluationMetricsNodes(workflow: IWorkflowBase) {
		return this.getEvaluationNodes(workflow, 'setMetrics');
	}

	static getEvaluationSetOutputsNodes(workflow: IWorkflowBase) {
		return this.getEvaluationNodes(workflow, 'setOutputs', { isDefaultOperation: true });
	}

	private extractDatasetTriggerOutput(execution: IRun, workflow: IWorkflowBase) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		assert(triggerNode);

		const triggerOutputData = execution.data.resultData.runData[triggerNode.name]?.[0];

		if (!triggerOutputData || triggerOutputData.error) {
			throw new TestRunError(TestRunErrorCode.CANT_FETCH_TEST_CASES, {
				message:
					triggerOutputData?.error?.message ?? 'Evaluation trigger node did not produce any output',
			});
		}

		const triggerOutput = triggerOutputData.data?.[NodeConnectionTypes.Main]?.[0];

		if (!triggerOutput || triggerOutput.length === 0) {
			throw new TestRunError(TestRunErrorCode.TEST_CASES_NOT_FOUND);
		}

		return triggerOutput;
	}

	private getEvaluationData(
		execution: IRun,
		workflow: IWorkflowBase,
		operation: 'setInputs' | 'setOutputs',
	): JsonObject {
		const evalNodes = TestRunnerService.getEvaluationNodes(workflow, operation);

		return evalNodes.reduce<JsonObject>((accu, node) => {
			const runs = execution.data.resultData.runData[node.name];
			const data = runs?.[0]?.data?.[NodeConnectionTypes.Main]?.[0]?.[0]?.evaluationData ?? {};

			Object.assign(accu, data);
			return accu;
		}, {});
	}

	/**
	 * Per-case `inputs`: the Set Inputs node's data when present, else the dataset
	 * row. Config-compiled runs have no Set Inputs node, so they use the row;
	 * `startNodeName` is undefined for direct/legacy runs (behavior unchanged).
	 */
	private resolveCaseInputs(
		execution: IRun,
		workflow: IWorkflowBase,
		testCase: INodeExecutionData,
		startNodeName: string | undefined,
	): JsonObject {
		const inputs = this.getEvaluationData(execution, workflow, 'setInputs');
		if (Object.keys(inputs).length > 0 || !startNodeName) return inputs;
		return this.datasetRowToJsonObject(testCase);
	}

	/**
	 * The dataset row's JSON as a plain object; empty object when it isn't one.
	 */
	private datasetRowToJsonObject(testCase: INodeExecutionData): JsonObject {
		return this.toJsonObject(testCase.json);
	}

	/** Coerce a value to a plain JSON object, or `{}` when it isn't one. */
	private toJsonObject(value: unknown): JsonObject {
		const out: JsonObject = {};
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(out, value);
		}
		return out;
	}

	/**
	 * Per-case `outputs`: the Set Outputs node's data when present, else the
	 * evaluated slice's end-node output. Config-compiled runs have no Set Outputs
	 * node; `endNodeName` is undefined for direct/legacy runs (unchanged).
	 */
	private resolveCaseOutputs(
		execution: IRun,
		workflow: IWorkflowBase,
		endNodeName: string | undefined,
	): JsonObject {
		const outputs = this.getEvaluationData(execution, workflow, 'setOutputs');
		if (Object.keys(outputs).length > 0 || !endNodeName) return outputs;
		return this.getEndNodeOutputs(execution, endNodeName);
	}

	/**
	 * The end node's first main output JSON for one case; empty object when it
	 * produced no JSON object (e.g. an untaken IF/Switch branch).
	 */
	private getEndNodeOutputs(execution: IRun, endNodeName: string): JsonObject {
		const mainBuckets =
			execution.data.resultData.runData[endNodeName]?.[0]?.data?.[NodeConnectionTypes.Main] ?? [];
		// An IF/Switch end node emits on one of several main branches, so read the
		// first branch that produced an item rather than always branch 0 — otherwise
		// a case that took a non-zero (e.g. "false") branch shows a blank output.
		const json = mainBuckets.find((bucket) => bucket?.[0]?.json !== undefined)?.[0]?.json;
		return this.toJsonObject(json);
	}

	/** Collects the evaluation result from all Evaluation Metrics nodes. */
	private extractUserDefinedMetrics(execution: IRun, workflow: IWorkflowBase): IDataObject {
		const metricsNodes = TestRunnerService.getEvaluationMetricsNodes(workflow);

		// If a metrics node did not execute, ignore it.
		const metricsRunData = metricsNodes
			.flatMap((node) => execution.data.resultData.runData[node.name])
			.filter((data) => data !== undefined);
		const metricsData = metricsRunData
			.reverse()
			.map((data) => data.data?.main?.[0]?.[0]?.json ?? {});
		const metricsResult = metricsData.reduce((acc, curr) => ({ ...acc, ...curr }), {});
		return metricsResult;
	}

	/** Extracts predefined metrics (token usage and execution time). */
	private extractPredefinedMetrics(execution: IRun) {
		const metricValues: Record<string, number> = {};

		const tokenUsageMetrics = extractTokenUsage(execution.data.resultData.runData);
		Object.assign(metricValues, tokenUsageMetrics.total);

		if (execution.startedAt && execution.stoppedAt) {
			metricValues.executionTime = execution.stoppedAt.getTime() - execution.startedAt.getTime();
		}

		return metricValues;
	}

	/**
	 * `concurrency` is the requested parallel test-case count; the effective value
	 * is `min(request, 10, evaluationLimit)`. Clamped 1–10 as a guardrail, then to
	 * the resolved evaluation limit. `concurrency = 1` reproduces legacy sequential.
	 */
	/**
	 * Awaits both setup and the detached execution — legacy "block until complete"
	 * semantics for tests. The HTTP path uses {@link startTestRun} directly.
	 */
	async runTest(user: User, workflowId: string, concurrency: number = 1): Promise<void> {
		const { finished } = await this.startTestRun(user, workflowId, concurrency);
		await finished;
	}

	async startTestRun(
		user: User,
		workflowId: string,
		concurrency: number = 1,
		options?: {
			collectionId?: string;
			workflowVersionId?: string;
			evaluationConfigId?: string;
			evaluationConfigSnapshot?: IDataObject;
			compileFromConfig?: boolean;
			via?: 'ui' | 'public-api';
			rowIndices?: number[];
		},
	): Promise<{ testRun: TestRun; finished: Promise<void> }> {
		const requestedConcurrency = Math.max(1, Math.min(10, Math.floor(concurrency)));
		const evaluationLimit = resolveEvaluationConcurrencyLimit(this.executionsConfig, this.license);
		const concurrencyLimitedByConfig =
			evaluationLimit > 0 && requestedConcurrency > evaluationLimit;
		const effectiveConcurrency = concurrencyLimitedByConfig
			? evaluationLimit
			: requestedConcurrency;

		this.logger.debug(
			`[Eval] runTest called: requestedConcurrency=${requestedConcurrency} effectiveConcurrency=${effectiveConcurrency} evaluationLimit=${evaluationLimit}`,
			{
				workflowId,
				collectionId: options?.collectionId,
				workflowVersionId: options?.workflowVersionId,
			},
		);

		const baseWorkflow = await this.workflowRepository.findById(workflowId);
		assert(baseWorkflow, 'Workflow not found');

		let workflow = baseWorkflow;
		if (options?.workflowVersionId) {
			const history = await this.workflowHistoryService.findVersion(
				workflowId,
				options.workflowVersionId,
			);
			assert(history, `Workflow version ${options.workflowVersionId} not found`);
			// Pin versionId so the execution row tags the snapshot, not live state.
			workflow = {
				...baseWorkflow,
				versionId: history.versionId,
				nodes: history.nodes,
				connections: history.connections,
			} as typeof baseWorkflow;
		}

		// Look up config BEFORE creating the row so compile failures land as a
		// recoverable error code on the row instead of HTTP 500.
		let evaluationConfigSnapshot = options?.evaluationConfigSnapshot ?? null;
		let configToCompile: EvaluationConfig | undefined;
		let configLookupErrorCode: typeof TestRunErrorCode.EVALUATION_CONFIG_NOT_FOUND | undefined;
		if (options?.compileFromConfig) {
			if (options.evaluationConfigSnapshot) {
				// Prefer the caller's frozen snapshot: collection runs pass one so every
				// version compiles against identical config, immune to a racing edit.
				configToCompile = options.evaluationConfigSnapshot as unknown as EvaluationConfig;
			} else if (options.evaluationConfigId) {
				// No snapshot supplied (single-run callers) — resolve the live config.
				const config = await this.evaluationConfigRepository.findByIdAndWorkflowId(
					options.evaluationConfigId,
					workflowId,
				);
				if (!config) {
					configLookupErrorCode = TestRunErrorCode.EVALUATION_CONFIG_NOT_FOUND;
				} else {
					configToCompile = config;
					evaluationConfigSnapshot = config as unknown as IDataObject;
				}
			}
		}

		const testRun = await this.testRunRepository.createTestRun(workflowId, {
			collectionId: options?.collectionId ?? null,
			workflowVersionId: options?.workflowVersionId ?? null,
			evaluationConfigId: options?.evaluationConfigId ?? null,
			evaluationConfigSnapshot,
		});
		assert(testRun, 'Unable to create a test run');

		if (configLookupErrorCode) {
			await this.testRunRepository.markAsError(testRun.id, configLookupErrorCode, {
				evaluationConfigId: options?.evaluationConfigId,
			});
			return { testRun, finished: Promise.resolve() };
		}

		const runType = configToCompile ? 'config' : 'direct';

		// Config-compiled runs lack Set Inputs/Outputs nodes; these name the
		// dataset-row and end-node fallbacks. Undefined for direct/legacy runs.
		let startNodeName: string | undefined;
		let endNodeName: string | undefined;

		if (configToCompile) {
			startNodeName = configToCompile.startNodeName;
			endNodeName = configToCompile.endNodeName;
			// `compile` injects its own __eval_trigger + metric nodes and neutralises
			// any pre-existing evaluation nodes the saved workflow already had.
			try {
				workflow = this.workflowCompiler.compile(workflow, configToCompile) as typeof workflow;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				await this.testRunRepository.markAsError(testRun.id, TestRunErrorCode.COMPILATION_FAILED, {
					evaluationConfigId: options?.evaluationConfigId,
					reason: message,
				});
				return { testRun, finished: Promise.resolve() };
			}
		}

		// Detached so the controller can return testRun.id before cases finish.
		// executeTestRun is synchronous until its first await, so abortControllers
		// is populated by the time we return — cancelTestRun(id) works immediately.
		const finished = this.executeTestRun({
			user,
			workflowId,
			workflow,
			testRun,
			effectiveConcurrency,
			concurrencyLimitedByConfig,
			runType,
			via: options?.via,
			rowIndices: options?.rowIndices,
			startNodeName,
			endNodeName,
		});

		return { testRun, finished };
	}

	private async executeTestRun({
		user,
		workflowId,
		workflow,
		testRun,
		effectiveConcurrency,
		concurrencyLimitedByConfig,
		runType,
		via = 'ui',
		rowIndices,
		startNodeName,
		endNodeName,
	}: {
		user: User;
		workflowId: string;
		workflow: IWorkflowBase;
		testRun: TestRun;
		effectiveConcurrency: number;
		concurrencyLimitedByConfig: boolean;
		runType: 'config' | 'direct';
		via?: 'ui' | 'public-api';
		rowIndices?: number[];
		startNodeName?: string;
		endNodeName?: string;
	}): Promise<void> {
		const telemetryMeta = {
			workflow_id: workflowId,
			test_type: 'evaluation',
			run_id: testRun.id,
			run_type: runType,
			via,
			start: Date.now(),
			status: 'success' as 'success' | 'fail' | 'cancelled',
			test_case_count: 0,
			errored_test_case_count: 0,
			metric_count: 0,
			error_message: '',
			duration: 0,
			concurrency: effectiveConcurrency,
			parallel_enabled: effectiveConcurrency > 1,
			concurrency_limited_by_config: concurrencyLimitedByConfig,
			concurrency_limit_source: getEvaluationConcurrencyLimitSource(this.license),
			// Realised parallelism, updated in lockstep with fanOutMetrics in the
			// per-case callback: cases that began (post-throttle) and the in-flight peak.
			cases_started: 0,
			peak_in_flight: 0,
		};

		const abortController = new AbortController();
		this.abortControllers.set(testRun.id, abortController);

		const testRunMetadata = {
			testRunId: testRun.id,
			userId: user.id,
		};

		const abortSignal = abortController.signal;
		const { manager: dbManager } = this.testRunRepository;

		try {
			// Tag with instance ID for multi-main coordination.
			await this.testRunRepository.markAsRunning(testRun.id, this.instanceSettings.hostId);

			this.validateWorkflowConfiguration(workflow);

			this.telemetry.track('User ran test', {
				user_id: user.id,
				run_id: testRun.id,
				workflow_id: workflowId,
				run_type: runType,
				via,
			});

			const datasetFetchExecution = await this.runDatasetTrigger(workflow, testRunMetadata);
			assert(datasetFetchExecution);

			const datasetTriggerOutput = this.extractDatasetTriggerOutput(
				datasetFetchExecution,
				workflow,
			);

			const allTestCases = datasetTriggerOutput.map((items) => ({ json: items.json }));

			// Run only the given `rowIndices` (out-of-range dropped) or all rows.
			const indicesToRun =
				rowIndices && rowIndices.length > 0
					? rowIndices.filter((i) => i >= 0 && i < allTestCases.length)
					: allTestCases.map((_, i) => i);

			const testCases = indicesToRun.map((i) => allTestCases[i]);
			telemetryMeta.test_case_count = testCases.length;

			this.logger.debug('Found test cases', {
				total: allTestCases.length,
				running: testCases.length,
			});

			// Seed one row per case; `runIndex` = original dataset index so the FE
			// maps results back even when running a subset. Seed the dataset row as
			// the case input too, so the compare view shows it while the case is still
			// pending (the runner refines it via `resolveCaseInputs` on execution).
			const seededCases = await this.testCaseExecutionRepository.createPendingBatch(
				testRun.id,
				indicesToRun.map((datasetIndex, position) => ({
					runIndex: datasetIndex,
					inputs: this.datasetRowToJsonObject(testCases[position]),
				})),
			);

			const metrics = new EvaluationMetrics();

			// pLimit(N) caps in-flight per-case tasks; concurrency=1 runs serial like
			// the legacy loop. Callbacks return contributions merged once after
			// Promise.all, so EvaluationMetrics is never touched concurrently. The
			// counter `++`s in the callback are safe under JS's single-threaded loop.
			const limit = pLimit(effectiveConcurrency);

			// Fan-out visibility; `inFlight` is mutated from callbacks (safe, see above).
			const fanOutMetrics = { inFlight: 0, peakInFlight: 0, casesStarted: 0 };
			this.logger.debug(
				`[Eval] Fan-out begin: cases=${testCases.length} concurrency=${effectiveConcurrency}`,
				{ testRunId: testRun.id, workflowId },
			);

			const contributionResults = await Promise.all(
				testCases.map(
					async (testCase, caseIndex) =>
						await limit(async (): Promise<MetricContribution[]> => {
							if (abortSignal.aborted) {
								return [];
							}

							// Atomic claim: proceed only if the row is still 'new'. A
							// pre-cancelled case affects 0 rows — bail before taking a
							// throttle slot a sibling run could use.
							const seededCase = seededCases[caseIndex];
							const claimed = await this.testCaseExecutionRepository.tryMarkCaseAsRunning(
								seededCase.id,
							);
							if (!claimed) {
								this.logger.debug('Test case skipped (cancelled before start)', {
									testRunId: testRun.id,
									caseId: seededCase.id,
								});
								return [];
							}

							// Per-case DB poll: defensive fallback when a foreign main sets
							// the cancel flag but pubsub doesn't reach us. Cheap (~1ms PK lookup).
							if (
								this.instanceSettings.isMultiMain &&
								(await this.testRunRepository.isCancellationRequested(testRun.id))
							) {
								this.logger.debug('Test run cancellation requested via database flag', {
									workflowId,
									testRunId: testRun.id,
								});
								abortController.abort();
								return [];
							}

							// Layer onto instance-wide concurrency control (no-op in queue
							// mode / unlimited): pLimit is per-run, the queue is instance-wide.
							// Abort-aware: if Stop is clicked while queued, evict ourselves so
							// the slot frees and we short-circuit — otherwise the case would
							// drain through, return undefined, and trip the assert below.
							const caseTrackingId = `${testRun.id}-case-${caseIndex}`;
							let abortHandler: (() => void) | undefined;
							let throttleAcquired = false;
							const abortRace = new Promise<'aborted'>((resolve) => {
								abortHandler = () => resolve('aborted');
								abortSignal.addEventListener('abort', abortHandler, { once: true });
							});
							const acquireRace = this.concurrencyControlService
								.throttle({ mode: 'evaluation', executionId: caseTrackingId })
								.then(() => {
									throttleAcquired = true;
									return 'acquired' as const;
								});
							const acquired = await Promise.race([acquireRace, abortRace]);

							if (acquired === 'aborted') {
								// Abort won the race. If throttle was already acquired (queue had
								// immediate capacity, microtask beat abort), release the slot;
								// otherwise remove() the possibly-queued entry (no-op if not
								// queued). Both defensive against scheduler ordering quirks.
								if (throttleAcquired) {
									this.concurrencyControlService.release({ mode: 'evaluation' });
								} else {
									this.concurrencyControlService.remove({
										mode: 'evaluation',
										executionId: caseTrackingId,
									});
								}
								return [];
							}

							if (abortHandler) {
								abortSignal.removeEventListener('abort', abortHandler);
							}

							// Narrow window: abort could fire between `throttle` resolving and
							// here. We have the capacity slot; release it and bail.
							if (abortSignal.aborted) {
								this.concurrencyControlService.release({ mode: 'evaluation' });
								return [];
							}

							// In-flight tracking (decremented in the finally). Mirror the peak
							// + started counts into telemetryMeta so they survive an error.
							fanOutMetrics.inFlight += 1;
							fanOutMetrics.casesStarted += 1;
							telemetryMeta.cases_started = fanOutMetrics.casesStarted;
							if (fanOutMetrics.inFlight > fanOutMetrics.peakInFlight) {
								fanOutMetrics.peakInFlight = fanOutMetrics.inFlight;
								telemetryMeta.peak_in_flight = fanOutMetrics.peakInFlight;
							}
							this.logger.debug(
								`[Eval] Case started: case=${caseIndex} inFlight=${fanOutMetrics.inFlight}/${effectiveConcurrency} peak=${fanOutMetrics.peakInFlight}`,
								{ testRunId: testRun.id },
							);

							const runAt = new Date();

							try {
								// Hoisted so the catch can link a failed case to its execution:
								// metric-extraction errors happen after the execution ran.
								let testCaseExecutionId: string | undefined;
								try {
									const testCaseMetadata = { ...testRunMetadata };

									const testCaseResult = await this.runTestCase(
										workflow,
										testCaseMetadata,
										testCase,
										abortSignal,
									);

									// `runTestCase` returns undefined only when aborted at entry.
									// Skip silently (outer path marks cancelled); assert the abort
									// invariant to catch future widening of the undefined return.
									if (!testCaseResult) {
										assert(
											abortSignal.aborted,
											'runTestCase returned undefined without abort being set',
										);
										return [];
									}

									const { executionData: testCaseExecution } = testCaseResult;
									testCaseExecutionId = testCaseResult.executionId;

									assert(testCaseExecution);
									assert(testCaseExecutionId);

									this.logger.debug('Test case execution finished');

									if (!testCaseExecution || testCaseExecution.data.resultData.error) {
										await this.testCaseExecutionRepository.update(seededCase.id, {
											executionId: testCaseExecutionId,
											status: 'error',
											errorCode: TestCaseExecutionErrorCode.FAILED_TO_EXECUTE_WORKFLOW,
											metrics: {},
											completedAt: new Date(),
										});
										telemetryMeta.errored_test_case_count++;
										return [];
									}
									const completedAt = new Date();

									const predefinedContribution = EvaluationMetrics.buildContribution(
										this.extractPredefinedMetrics(testCaseExecution),
									);
									this.logger.debug(
										'Test case common metrics extracted',
										predefinedContribution.addedMetrics,
									);

									const userDefinedContribution = EvaluationMetrics.buildContribution(
										this.extractUserDefinedMetrics(testCaseExecution, workflow),
									);

									if (Object.keys(userDefinedContribution.addedMetrics).length === 0) {
										await this.testCaseExecutionRepository.update(seededCase.id, {
											executionId: testCaseExecutionId,
											runAt,
											completedAt,
											status: 'error',
											errorCode: TestCaseExecutionErrorCode.NO_METRICS_COLLECTED,
										});
										telemetryMeta.errored_test_case_count++;
										// Predefined metrics still merge — the case ran, just had no user metrics.
										return [predefinedContribution];
									}

									const combinedMetrics = {
										...userDefinedContribution.addedMetrics,
										...predefinedContribution.addedMetrics,
									};

									const inputs = this.resolveCaseInputs(
										testCaseExecution,
										workflow,
										testCase,
										startNodeName,
									);
									const outputs = this.resolveCaseOutputs(testCaseExecution, workflow, endNodeName);

									this.logger.debug(
										'Test case metrics extracted (user-defined)',
										userDefinedContribution.addedMetrics,
									);

									await this.testCaseExecutionRepository.update(seededCase.id, {
										executionId: testCaseExecutionId,
										runAt,
										completedAt,
										status: 'success',
										metrics: combinedMetrics,
										inputs,
										outputs,
									});

									return [predefinedContribution, userDefinedContribution];
								} catch (e) {
									const completedAt = new Date();
									this.logger.error('[Eval] Test case execution failed', {
										workflowId,
										testRunId: testRun.id,
										caseIndex,
										errorName: e instanceof Error ? e.name : 'Unknown',
										errorMessage: e instanceof Error ? e.message : String(e),
										errorStack: e instanceof Error ? e.stack : undefined,
									});

									telemetryMeta.errored_test_case_count++;

									// `executionId` is left undefined when the failure happened before
									// an execution was created; TypeORM skips undefined fields on update.
									if (e instanceof TestCaseExecutionError) {
										await this.testCaseExecutionRepository.update(seededCase.id, {
											executionId: testCaseExecutionId,
											runAt,
											completedAt,
											status: 'error',
											errorCode: e.code,
											errorDetails: e.extra as IDataObject,
										});
									} else {
										await this.testCaseExecutionRepository.update(seededCase.id, {
											executionId: testCaseExecutionId,
											runAt,
											completedAt,
											status: 'error',
											errorCode: TestCaseExecutionErrorCode.UNKNOWN_ERROR,
										});
										this.errorReporter.error(e);
									}
									return [];
								}
							} finally {
								// Always release capacity, even when runTestCase throws.
								// The synthetic id is irrelevant — release dequeues by mode.
								this.concurrencyControlService.release({ mode: 'evaluation' });
								fanOutMetrics.inFlight -= 1;
								this.logger.debug(
									`[Eval] Case finished: case=${caseIndex} inFlight=${fanOutMetrics.inFlight}/${effectiveConcurrency}`,
									{ testRunId: testRun.id },
								);
							}
						}),
				),
			);

			this.logger.debug(
				`[Eval] Fan-out complete: cases=${fanOutMetrics.casesStarted} peakInFlight=${fanOutMetrics.peakInFlight}/${effectiveConcurrency}`,
				{ testRunId: testRun.id },
			);

			// Single-threaded merge step. Order is irrelevant for averages
			// (within IEEE-754 precision; see evaluation-metrics tests).
			for (const caseContributions of contributionResults) {
				for (const contribution of caseContributions) {
					metrics.mergeContribution(contribution);
				}
			}

			// Complete or cancel. The per-case DB poll can trigger the abort, and
			// this is where cancellation telemetry status is set for both paths.
			if (abortSignal.aborted) {
				this.logger.debug('Test run was cancelled', { workflowId });
				await dbManager.transaction(async (trx) => {
					await this.testRunRepository.markAsCancelled(testRun.id, trx);
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRun.id, trx);
				});
				telemetryMeta.status = 'cancelled';
			} else {
				const aggregatedMetrics = metrics.getAggregatedMetrics();
				telemetryMeta.metric_count = Object.keys(aggregatedMetrics).length;

				this.logger.debug('Aggregated metrics', aggregatedMetrics);

				await this.testRunRepository.markAsCompleted(testRun.id, aggregatedMetrics);

				// A fresh completed run can flip the collection's insights
				// winner/regressions, so bust the cached envelope. Failure must
				// NOT propagate — the run is already persisted as completed, and
				// re-marking it error would lose a successful run; worst case is a
				// stale envelope until the next `forceRegenerate`.
				if (testRun.collectionId) {
					try {
						await this.evaluationCollectionRepository.updateInsightsCache(
							testRun.collectionId,
							null,
						);
					} catch (cacheError) {
						this.logger.warn('Failed to bust eval-collection insights cache', {
							testRunId: testRun.id,
							collectionId: testRun.collectionId,
							error: cacheError instanceof Error ? cacheError.message : String(cacheError),
						});
					}
				}

				this.logger.debug('Test run finished', { workflowId, testRunId: testRun.id });
			}
		} catch (e) {
			telemetryMeta.status = 'fail';

			if (e instanceof ExecutionCancelledError) {
				this.logger.debug('Evaluation execution was cancelled. Cancelling test run', {
					testRunId: testRun.id,
					stoppedOn: e.extra?.executionId,
				});

				await dbManager.transaction(async (trx) => {
					await this.testRunRepository.markAsCancelled(testRun.id, trx);
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRun.id, trx);
				});

				telemetryMeta.status = 'cancelled';
			} else if (e instanceof TestRunError) {
				await this.testRunRepository.markAsError(testRun.id, e.code, e.extra as IDataObject);
				telemetryMeta.error_message = e.code;
				if (e.extra && typeof e.extra === 'object' && 'message' in e.extra) {
					telemetryMeta.error_message += `: ${String(e.extra.message)}`;
				}
			} else {
				await this.testRunRepository.markAsError(testRun.id, TestRunErrorCode.UNKNOWN_ERROR);
				telemetryMeta.error_message = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
				throw e;
			}
		} finally {
			telemetryMeta.duration = Date.now() - telemetryMeta.start;

			this.abortControllers.delete(testRun.id);

			// Clear instance tracking fields (runningInstanceId, cancelRequested).
			await this.testRunRepository.clearInstanceTracking(testRun.id);

			const telemetryPayload: Record<string, GenericValue> = {
				...telemetryMeta,
				// `collection_id` is null for legacy one-off runs so analytics can
				// split cohorts cleanly.
				collection_id: testRun.collectionId ?? null,
				is_part_of_collection: testRun.collectionId !== null,
			};

			if (telemetryMeta.status === 'success') {
				telemetryPayload.test_case_count = telemetryMeta.test_case_count;
				telemetryPayload.errored_test_case_count = telemetryMeta.errored_test_case_count;
				telemetryPayload.metric_count = telemetryMeta.metric_count;
			}

			if (telemetryMeta.status === 'fail') {
				telemetryPayload.error_message = telemetryMeta.error_message;
			}

			this.telemetry.track('Test run finished', telemetryPayload);
		}
	}

	/** Whether the test run is in a cancellable state. */
	canBeCancelled(testRun: TestRun) {
		return testRun.status !== 'running' && testRun.status !== 'new';
	}

	/**
	 * Cancel a run locally by aborting its controller. Called directly and via
	 * the pub/sub handler.
	 */
	private cancelTestRunLocally(testRunId: string): boolean {
		const abortController = this.abortControllers.get(testRunId);
		if (abortController) {
			this.logger.debug('Cancelling test run locally', { testRunId });
			abortController.abort();
			this.abortControllers.delete(testRunId);
			return true;
		}
		return false;
	}

	/** Handle the cancel-test-run pub/sub command from other main instances. */
	@OnPubSubEvent('cancel-test-run', { instanceType: 'main' })
	handleCancelTestRunCommand({ testRunId }: { testRunId: string }) {
		this.logger.debug('Received cancel-test-run command via pub/sub', { testRunId });
		this.cancelTestRunLocally(testRunId);
	}

	/**
	 * Handle the cancel-collection pub/sub command: each main aborts the runs it
	 * owns locally; runs held elsewhere are no-ops (DB fallback handles them).
	 */
	@OnPubSubEvent('cancel-collection', { instanceType: 'main' })
	async handleCancelCollectionCommand({ collectionId }: { collectionId: string }) {
		this.logger.debug('Received cancel-collection command via pub/sub', { collectionId });
		await this.cancelCollectionLocally(collectionId);
	}

	private async cancelCollectionLocally(collectionId: string): Promise<string[]> {
		// Include `new`, not just `running`: the abort controller is registered
		// before `markAsRunning` flips status, so a freshly-kicked-off run is
		// locally abortable while still `new` in DB.
		const runs = await this.testRunRepository.find({
			where: [
				{ collectionId, status: 'running' },
				{ collectionId, status: 'new' },
			],
			select: ['id'],
		});
		const cancelledLocally: string[] = [];
		for (const { id } of runs) {
			if (this.cancelTestRunLocally(id)) cancelledLocally.push(id);
		}
		return cancelledLocally;
	}

	/**
	 * Cancels every in-flight run in a collection. Mirrors {@link cancelTestRun}'s
	 * fan-out: abort locally, set the DB flag per run as fallback, and broadcast
	 * via pubsub for foreign mains.
	 */
	async cancelCollection(collectionId: string): Promise<{ cancelledRunIds: string[] }> {
		// Flag every still-active run for fallback DB-poll cancellation.
		const activeRuns = await this.testRunRepository.find({
			where: [
				{ collectionId, status: 'running' },
				{ collectionId, status: 'new' },
			],
			select: ['id'],
		});
		for (const { id } of activeRuns) {
			await this.testRunRepository.requestCancellation(id);
		}

		// Try local cancellation for whatever this main owns.
		const cancelledLocally = await this.cancelCollectionLocally(collectionId);

		// In multi-main or queue mode, broadcast so foreign mains cancel their share.
		if (this.instanceSettings.isMultiMain || this.executionsConfig.mode === 'queue') {
			this.logger.debug('Broadcasting cancel-collection command via pub/sub', { collectionId });
			await this.publisher.publishCommand({
				command: 'cancel-collection',
				payload: { collectionId },
			});
		}

		// Fallback for runs we don't own locally. Race protection: a foreign main
		// may have completed a run since `activeRuns` was sampled, so scope the
		// update by status — a plain markAsCancelled would clobber the terminal
		// state. 0 rows affected means natural completion won; skip its case sweep.
		const localSet = new Set(cancelledLocally);
		const fallbackRunIds = activeRuns.map((r) => r.id).filter((id) => !localSet.has(id));
		if (fallbackRunIds.length > 0) {
			const { manager: dbManager } = this.testRunRepository;
			await dbManager.transaction(async (trx) => {
				for (const runId of fallbackRunIds) {
					const result = await trx.update(
						TestRun,
						{ id: runId, status: In(['new', 'running']) },
						{ status: 'cancelled', completedAt: new Date() },
					);
					if (result.affected) {
						await this.testCaseExecutionRepository.markAllPendingAsCancelled(runId, trx);
					}
				}
			});
		}

		return { cancelledRunIds: activeRuns.map((r) => r.id) };
	}

	/**
	 * Cancels a test run. In multi-main mode, broadcasts via pub/sub and sets a
	 * DB flag as fallback.
	 */
	async cancelTestRun(testRunId: string) {
		// Set the DB cancellation flag (fallback for polling).
		await this.testRunRepository.requestCancellation(testRunId);

		// Try local cancellation first.
		const cancelledLocally = this.cancelTestRunLocally(testRunId);

		// In multi-main or queue mode, broadcast cancellation to all instances.
		if (this.instanceSettings.isMultiMain || this.executionsConfig.mode === 'queue') {
			this.logger.debug('Broadcasting cancel-test-run command via pub/sub', { testRunId });
			await this.publisher.publishCommand({
				command: 'cancel-test-run',
				payload: { testRunId },
			});
		}

		// If not running locally, mark cancelled in DB as fallback (single-main, or
		// multi-main where the owner is unreachable). Same race protection as
		// `cancelCollection`: scope by status so a natural completion wins.
		if (!cancelledLocally) {
			const { manager: dbManager } = this.testRunRepository;
			await dbManager.transaction(async (trx) => {
				const result = await trx.update(
					TestRun,
					{ id: testRunId, status: In(['new', 'running']) },
					{ status: 'cancelled', completedAt: new Date() },
				);
				if (result.affected) {
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRunId, trx);
				}
			});
		}
	}
}
