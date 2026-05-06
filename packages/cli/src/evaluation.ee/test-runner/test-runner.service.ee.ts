import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import type { User, TestRun } from '@n8n/db';
import { TestCaseExecutionRepository, TestRunRepository, WorkflowRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
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
import { EventService } from '@/events/event.service';
import { TestCaseExecutionError, TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import {
	checkNodeParameterNotEmpty,
	extractTokenUsage,
} from '@/evaluation.ee/test-runner/utils.ee';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';

import { EvaluationMetrics, type MetricContribution } from './evaluation-metrics.ee';

export interface TestRunMetadata {
	testRunId: string;
	userId: string;
}

export interface TestCaseExecutionResult {
	executionData: IRun;
	executionId: string;
}

/**
 * This service orchestrates the running of evaluations.
 * It makes a partial execution of the workflow under test to get the dataset
 * by running the evaluation trigger node only and capturing the output.
 * Then it iterates over test cases (the items of a list produced by evaluation trigger node)
 * and runs the workflow under test with each test case as input.
 * After running each test case, it collects the metrics from the evaluation nodes output.
 * After all test cases are run, it aggregates the metrics and saves them to the database.
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
	) {}

	/**
	 * Finds the dataset trigger node in the workflow
	 */
	private findEvaluationTriggerNode(workflow: IWorkflowBase) {
		return workflow.nodes.find((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE);
	}

	/**
	 * Validates the evaluation trigger node is present in the workflow
	 * and is configured correctly.
	 */
	private validateEvaluationTriggerNode(workflow: IWorkflowBase) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		if (!triggerNode) {
			throw new TestRunError('EVALUATION_TRIGGER_NOT_FOUND');
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
			throw new TestRunError('EVALUATION_TRIGGER_NOT_CONFIGURED', { node_name: name });
		}

		if (triggerNode?.disabled) {
			throw new TestRunError('EVALUATION_TRIGGER_DISABLED');
		}
	}

	/**
	 * Checks if the Evaluation Set Metrics nodes are present in the workflow
	 * and are configured correctly.
	 */
	private hasModelNodeConnected(workflow: IWorkflowBase, targetNodeName: string): boolean {
		// Check if there's a node connected to the target node via ai_languageModel connection type
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
			throw new TestRunError('SET_METRICS_NODE_NOT_FOUND');
		}

		const unconfiguredMetricsNode = metricsNodes.find((node) => {
			if (node.disabled === true || !node.parameters) {
				return true;
			}

			// Check customMetrics configuration if:
			// - Version 4.7+ and metric is 'customMetrics'
			// - Version < 4.7 (customMetrics is default)
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
			throw new TestRunError('SET_METRICS_NODE_NOT_CONFIGURED', {
				node_name: unconfiguredMetricsNode.name,
			});
		}
	}

	/**
	 * Checks if the Evaluation Set Outputs nodes are present in the workflow
	 * and are configured correctly.
	 */
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
			throw new TestRunError('SET_OUTPUTS_NODE_NOT_CONFIGURED', {
				node_name: unconfiguredSetOutputsNode.name,
			});
		}
	}

	/**
	 * Validates workflow configuration for evaluation
	 * Throws appropriate TestRunError if validation fails
	 */
	private validateWorkflowConfiguration(workflow: IWorkflowBase): void {
		this.validateEvaluationTriggerNode(workflow);

		this.validateSetOutputsNodes(workflow);

		this.validateSetMetricsNodes(workflow);
	}

	/**
	 * Runs a test case with the given input.
	 * Injects the input data as pinned data of evaluation trigger node.
	 * Waits for the workflow under test to finish execution.
	 */
	private async runTestCase(
		workflow: IWorkflowBase,
		metadata: TestRunMetadata,
		testCase: INodeExecutionData,
		abortSignal: AbortSignal,
	): Promise<TestCaseExecutionResult | undefined> {
		// Do not run if the test run is cancelled
		if (abortSignal.aborted) {
			return;
		}

		// Prepare the data to run the workflow
		// Evaluation executions should run the same way as manual,
		// because they need pinned data and partial execution logic

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
			triggerToStartFrom: {
				name: triggerNode.name,
			},
		};

		// When in queue mode, we need to pass additional data to the execution
		// the same way as it would be passed in manual mode
		if (this.executionsConfig.mode === 'queue') {
			data.executionData = createRunExecutionData({
				executionData: null,
				resultData: {
					pinData,
				},
				manualData: {
					userId: metadata.userId,
					triggerToStartFrom: {
						name: triggerNode.name,
					},
				},
			});
		}

		// Trigger the workflow under test with mocked data
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		this.eventService.emit('workflow-executed', {
			user: metadata.userId ? { id: metadata.userId } : undefined,
			workflowId: workflow.id,
			workflowName: workflow.name,
			executionId,
			source: 'evaluation',
		});

		// Listen to the abort signal to stop the execution in case test run is cancelled
		abortSignal.addEventListener('abort', () => {
			this.activeExecutions.stopExecution(
				executionId,
				new ManualExecutionCancelledError(executionId),
			);
		});

		// Wait for the execution to finish
		const executionData = await this.activeExecutions.getPostExecutePromise(executionId);

		assert(executionData);

		return { executionId, executionData };
	}

	/**
	 * This method creates a partial workflow execution to run the dataset trigger only
	 * to get the whole dataset.
	 */
	private async runDatasetTrigger(workflow: IWorkflowBase, metadata: TestRunMetadata) {
		// Prepare the data to run the workflow
		// Evaluation executions should run the same way as manual,
		// because they need pinned data and partial execution logic

		const triggerNode = this.findEvaluationTriggerNode(workflow);

		if (!triggerNode) {
			throw new TestRunError('EVALUATION_TRIGGER_NOT_FOUND');
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
			// In regular mode we need executionData.executionData to be passed, but when
			// offloading manual execution to workers the workflow evaluation fails if
			// executionData.executionData is present, so we remove it in this case.
			// We keep executionData itself (with startData, manualData) intact.
			// @ts-expect-error - Removing nested executionData property for queue mode
			delete data.executionData.executionData;
		}

		// Trigger the workflow under test with mocked data
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		// Wait for the execution to finish
		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

		return await executePromise;
	}

	/**
	 * Get the evaluation set metrics nodes from a workflow.
	 */
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

	/**
	 * Get the evaluation set metrics nodes from a workflow.
	 */
	static getEvaluationMetricsNodes(workflow: IWorkflowBase) {
		return this.getEvaluationNodes(workflow, 'setMetrics');
	}

	/**
	 * Get the evaluation set outputs nodes from a workflow.
	 */
	static getEvaluationSetOutputsNodes(workflow: IWorkflowBase) {
		return this.getEvaluationNodes(workflow, 'setOutputs', { isDefaultOperation: true });
	}

	/**
	 * Extract the dataset trigger output
	 */
	private extractDatasetTriggerOutput(execution: IRun, workflow: IWorkflowBase) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		assert(triggerNode);

		const triggerOutputData = execution.data.resultData.runData[triggerNode.name]?.[0];

		if (!triggerOutputData || triggerOutputData.error) {
			throw new TestRunError('CANT_FETCH_TEST_CASES', {
				message:
					triggerOutputData?.error?.message ?? 'Evaluation trigger node did not produce any output',
			});
		}

		const triggerOutput = triggerOutputData.data?.[NodeConnectionTypes.Main]?.[0];

		if (!triggerOutput || triggerOutput.length === 0) {
			throw new TestRunError('TEST_CASES_NOT_FOUND');
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
	 * Evaluation result is collected from all Evaluation Metrics nodes
	 */
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

	/**
	 * Extracts predefined metrics from the execution data.
	 * Currently, it extracts token usage and execution time.
	 */
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
	 * Creates a new test run for the given workflow.
	 *
	 * `concurrency` is the requested number of test cases to run in parallel.
	 * The effective value is `min(user_request, 10, evaluationLimit)`:
	 *   - Clamped 1–10 as a defensive UX guardrail (the controller already
	 *     validates this via zod, but direct service callers must not exceed
	 *     it either).
	 *   - Further clamped to `evaluationLimit` (`N8N_CONCURRENCY_EVALUATION_LIMIT`)
	 *     when an admin has set a positive cap. `concurrency_limited_by_config`
	 *     is recorded in telemetry when this kicks in.
	 *
	 * `concurrency = 1` reproduces the legacy sequential behaviour exactly.
	 */
	async runTest(
		user: User,
		workflowId: string,
		concurrency: number = 1,
		flagEnabledForUser: boolean = false,
	): Promise<void> {
		const requestedConcurrency = Math.max(1, Math.min(10, Math.floor(concurrency)));
		const evaluationLimit = this.executionsConfig.concurrency.evaluationLimit;
		const concurrencyLimitedByConfig =
			evaluationLimit > 0 && requestedConcurrency > evaluationLimit;
		const effectiveConcurrency = concurrencyLimitedByConfig
			? evaluationLimit
			: requestedConcurrency;

		this.logger.debug(
			`[Eval] runTest called: requestedConcurrency=${requestedConcurrency} effectiveConcurrency=${effectiveConcurrency} evaluationLimit=${evaluationLimit} flagEnabledForUser=${flagEnabledForUser}`,
			{ workflowId },
		);

		const workflow = await this.workflowRepository.findById(workflowId);
		assert(workflow, 'Workflow not found');

		// 0. Create new Test Run
		const testRun = await this.testRunRepository.createTestRun(workflowId);
		assert(testRun, 'Unable to create a test run');

		// Initialize telemetry metadata
		const telemetryMeta = {
			workflow_id: workflowId,
			test_type: 'evaluation',
			run_id: testRun.id,
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
			flag_enabled_for_user: flagEnabledForUser,
			// Realised parallelism observed at runtime — `cases_started` counts
			// callbacks that actually began (post-throttle, pre-abort), and
			// `peak_in_flight` is the high-water mark for in-flight cases.
			// Updated in lockstep with fanOutMetrics inside the per-case callback;
			// stays at 0 if the run aborts before the fan-out begins.
			cases_started: 0,
			peak_in_flight: 0,
		};

		// 0.1 Initialize AbortController
		const abortController = new AbortController();
		this.abortControllers.set(testRun.id, abortController);

		// 0.2 Initialize metadata
		// This will be passed to the test case executions
		const testRunMetadata = {
			testRunId: testRun.id,
			userId: user.id,
		};

		const abortSignal = abortController.signal;
		const { manager: dbManager } = this.testRunRepository;

		try {
			// Update test run status with instance ID for multi-main coordination
			await this.testRunRepository.markAsRunning(testRun.id, this.instanceSettings.hostId);

			// Check if the workflow is ready for evaluation
			this.validateWorkflowConfiguration(workflow);

			this.telemetry.track('User ran test', {
				user_id: user.id,
				run_id: testRun.id,
				workflow_id: workflowId,
			});

			///
			// 1. Make test cases list
			///

			const datasetFetchExecution = await this.runDatasetTrigger(workflow, testRunMetadata);
			assert(datasetFetchExecution);

			const datasetTriggerOutput = this.extractDatasetTriggerOutput(
				datasetFetchExecution,
				workflow,
			);

			const testCases = datasetTriggerOutput.map((items) => ({ json: items.json }));
			telemetryMeta.test_case_count = testCases.length;

			this.logger.debug('Found test cases', { count: testCases.length });

			// Initialize object to collect the results of the evaluation workflow executions
			const metrics = new EvaluationMetrics();

			///
			// 2. Run over all the test cases
			///

			// pLimit(N) governs how many per-case tasks may be in flight at
			// once. With concurrency=1 the per-case callback runs in serial,
			// reproducing the legacy `for…of` loop exactly. Each callback
			// returns the contributions it built; merging happens once on the
			// main thread after Promise.all so EvaluationMetrics state is
			// never touched concurrently.
			//
			// `telemetryMeta.*++` increments inside the callback are safe under
			// JS's single-threaded event loop: `++` is synchronous, and there
			// is no `await` between the read and the write of the counter.
			const limit = pLimit(effectiveConcurrency);

			// Visibility for parallel fan-out. The `inFlight` counter is mutated
			// from per-case callbacks but the increments are safe — JS's single-
			// threaded event loop guarantees no interleaving between read and
			// write of `++` within a sync block.
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

							// Multi-main DB cancellation poll, run per case as a defensive
							// fallback for the rare case a foreign main flips the cancel
							// flag but the pubsub broadcast doesn't reach this instance.
							// Cheap (~1ms indexed PK lookup); kept as-is rather than
							// optimised to once-per-run to preserve the existing safety net.
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

							// Layer onto the existing instance-wide concurrency control. The
							// service is a no-op in queue mode (BullMQ governs there) and when
							// `evaluationLimit` is unset (-1). pLimit and the eval queue cap
							// the in-flight count at *the same number* by design — pLimit is
							// per-run, the queue is shared across all test runs from all users
							// on the instance, so they're complementary, not redundant.
							//
							// Abort-aware acquisition: if Stop is clicked while we're queued
							// behind another evaluation's capacity, we evict ourselves from the
							// queue so the slot returns to circulation and our task short-
							// circuits promptly instead of waiting for an unrelated run to
							// release. Without this, queued cases would block until they drained
							// through the queue — and then `runTestCase` would return undefined
							// (abort observed at its top), tripping the assert below and landing
							// a misleading UNKNOWN_ERROR test-case row.
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
								// Two abort sub-cases handled defensively, distinguished by
								// whether throttle's `.then` microtask managed to set
								// `throttleAcquired` before abort won the race:
								//
								// 1. throttleAcquired = true — the eval queue had immediate
								//    capacity (no queue push, slot synchronously consumed),
								//    and the `.then` microtask fired before abort. Race
								//    *should* have picked 'acquired' in this ordering, but
								//    handle defensively against scheduler quirks: release
								//    the slot back to the queue.
								// 2. throttleAcquired = false — we were either still queued
								//    (capacity wasn't available) or the immediate-acquire's
								//    microtask hadn't fired yet. Either way, remove() splices
								//    a queued entry (frees the slot via internal capacity++)
								//    and is a no-op for non-queued entries. The unawaited
								//    acquireRace becomes garbage.
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

							// In-flight tracking — increment as we leave the throttle and
							// decrement in the outer finally. The peak counter shows whether
							// the runner actually fanned out concurrently. Mirror the two
							// summary stats into telemetryMeta so they survive into the
							// `Test run finished` event even if the run errors mid-fan-out.
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
								try {
									const testCaseMetadata = { ...testRunMetadata };

									const testCaseResult = await this.runTestCase(
										workflow,
										testCaseMetadata,
										testCase,
										abortSignal,
									);

									// `runTestCase` returns undefined only when `abortSignal.aborted`
									// is true at entry (see method body). Skip silently so the outer
									// reconciliation can mark the run as cancelled — landing an
									// UNKNOWN_ERROR test-case row here would be misleading. Asserting
									// the abort invariant catches future regressions where the
									// undefined return path widens.
									if (!testCaseResult) {
										assert(
											abortSignal.aborted,
											'runTestCase returned undefined without abort being set',
										);
										return [];
									}

									const { executionId: testCaseExecutionId, executionData: testCaseExecution } =
										testCaseResult;

									assert(testCaseExecution);
									assert(testCaseExecutionId);

									this.logger.debug('Test case execution finished');

									if (!testCaseExecution || testCaseExecution.data.resultData.error) {
										await this.testCaseExecutionRepository.createTestCaseExecution({
											executionId: testCaseExecutionId,
											testRun: { id: testRun.id },
											status: 'error',
											errorCode: 'FAILED_TO_EXECUTE_WORKFLOW',
											metrics: {},
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
										await this.testCaseExecutionRepository.createTestCaseExecution({
											executionId: testCaseExecutionId,
											testRun: { id: testRun.id },
											runAt,
											completedAt,
											status: 'error',
											errorCode: 'NO_METRICS_COLLECTED',
										});
										telemetryMeta.errored_test_case_count++;
										// Predefined metrics still merge — the case ran, just had no user metrics.
										return [predefinedContribution];
									}

									const combinedMetrics = {
										...userDefinedContribution.addedMetrics,
										...predefinedContribution.addedMetrics,
									};

									const inputs = this.getEvaluationData(testCaseExecution, workflow, 'setInputs');
									const outputs = this.getEvaluationData(testCaseExecution, workflow, 'setOutputs');

									this.logger.debug(
										'Test case metrics extracted (user-defined)',
										userDefinedContribution.addedMetrics,
									);

									await this.testCaseExecutionRepository.createTestCaseExecution({
										executionId: testCaseExecutionId,
										testRun: { id: testRun.id },
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

									if (e instanceof TestCaseExecutionError) {
										await this.testCaseExecutionRepository.createTestCaseExecution({
											testRun: { id: testRun.id },
											runAt,
											completedAt,
											status: 'error',
											errorCode: e.code,
											errorDetails: e.extra as IDataObject,
										});
									} else {
										await this.testCaseExecutionRepository.createTestCaseExecution({
											testRun: { id: testRun.id },
											runAt,
											completedAt,
											status: 'error',
											errorCode: 'UNKNOWN_ERROR',
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

			// Mark the test run as completed or cancelled. The multi-main DB
			// poll inside each per-case callback can flip `abortController.abort()`
			// on its own; this branch is the only place telemetry status is set
			// for cancellations, so both the user-initiated and poll-initiated
			// paths converge here.
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
				await this.testRunRepository.markAsError(testRun.id, 'UNKNOWN_ERROR');
				telemetryMeta.error_message = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
				throw e;
			}
		} finally {
			// Calculate duration
			telemetryMeta.duration = Date.now() - telemetryMeta.start;

			// Clean up abort controller
			this.abortControllers.delete(testRun.id);

			// Clear instance tracking fields (runningInstanceId, cancelRequested)
			await this.testRunRepository.clearInstanceTracking(testRun.id);

			// Send telemetry event with complete metadata
			const telemetryPayload: Record<string, GenericValue> = {
				...telemetryMeta,
			};

			// Add success-specific fields
			if (telemetryMeta.status === 'success') {
				telemetryPayload.test_case_count = telemetryMeta.test_case_count;
				telemetryPayload.errored_test_case_count = telemetryMeta.errored_test_case_count;
				telemetryPayload.metric_count = telemetryMeta.metric_count;
			}

			// Add fail-specific fields
			if (telemetryMeta.status === 'fail') {
				telemetryPayload.error_message = telemetryMeta.error_message;
			}

			this.telemetry.track('Test run finished', telemetryPayload);
		}
	}

	/**
	 * Checks if the test run in a cancellable state.
	 */
	canBeCancelled(testRun: TestRun) {
		return testRun.status !== 'running' && testRun.status !== 'new';
	}

	/**
	 * Attempts to cancel a test run locally by aborting its controller.
	 * This is called both directly and via pub/sub event handler.
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

	/**
	 * Handle cancel-test-run pub/sub command from other main instances.
	 */
	@OnPubSubEvent('cancel-test-run', { instanceType: 'main' })
	handleCancelTestRunCommand({ testRunId }: { testRunId: string }) {
		this.logger.debug('Received cancel-test-run command via pub/sub', { testRunId });
		this.cancelTestRunLocally(testRunId);
	}

	/**
	 * Cancels the test run with the given ID.
	 * In multi-main mode, this broadcasts the cancellation to all instances via pub/sub
	 * and sets a database flag as a fallback mechanism.
	 */
	async cancelTestRun(testRunId: string) {
		// 1. Set the database cancellation flag (fallback for polling)
		await this.testRunRepository.requestCancellation(testRunId);

		// 2. Try local cancellation first
		const cancelledLocally = this.cancelTestRunLocally(testRunId);

		// 3. In multi-main or queue mode, broadcast cancellation to all instances
		if (this.instanceSettings.isMultiMain || this.executionsConfig.mode === 'queue') {
			this.logger.debug('Broadcasting cancel-test-run command via pub/sub', { testRunId });
			await this.publisher.publishCommand({
				command: 'cancel-test-run',
				payload: { testRunId },
			});
		}

		// 4. If not running locally, mark as cancelled in DB as a fallback
		// This handles both single-main (where this is the only instance) and multi-main
		// (where the running instance may be dead or unreachable via pub/sub)
		if (!cancelledLocally) {
			const { manager: dbManager } = this.testRunRepository;
			await dbManager.transaction(async (trx) => {
				await this.testRunRepository.markAsCancelled(testRunId, trx);
				await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRunId, trx);
			});
		}
	}
}
