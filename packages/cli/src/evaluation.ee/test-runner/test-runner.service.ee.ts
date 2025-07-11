import { Logger } from '@n8n/backend-common';
import type { User, TestRun } from '@n8n/db';
import { TestCaseExecutionRepository, TestRunRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import {
	EVALUATION_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	ExecutionCancelledError,
} from 'n8n-workflow';
import type {
	IDataObject,
	IRun,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	INodeExecutionData,
	AssignmentCollectionValue,
	GenericValue,
	IExecuteData,
} from 'n8n-workflow';
import assert from 'node:assert';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { TestCaseExecutionError, TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import {
	checkNodeParameterNotEmpty,
	extractTokenUsage,
} from '@/evaluation.ee/test-runner/utils.ee';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';

import { EvaluationMetrics } from './evaluation-metrics.ee';

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

		if (
			!triggerNode.credentials ||
			!checkNodeParameterNotEmpty(triggerNode.parameters?.documentId) ||
			!checkNodeParameterNotEmpty(triggerNode.parameters?.sheetName)
		) {
			throw new TestRunError('EVALUATION_TRIGGER_NOT_CONFIGURED', { node_name: triggerNode.name });
		}

		if (triggerNode?.disabled) {
			throw new TestRunError('EVALUATION_TRIGGER_DISABLED');
		}
	}

	/**
	 * Checks if the Evaluation Set Metrics nodes are present in the workflow
	 * and are configured correctly.
	 */
	private validateSetMetricsNodes(workflow: IWorkflowBase) {
		const metricsNodes = TestRunnerService.getEvaluationMetricsNodes(workflow);
		if (metricsNodes.length === 0) {
			throw new TestRunError('SET_METRICS_NODE_NOT_FOUND');
		}

		const unconfiguredMetricsNode = metricsNodes.find((node) => {
			if (node.disabled === true || !node.parameters) {
				return true;
			}

			// For versions 4.7+, check if metric parameter is missing
			if (node.typeVersion >= 4.7 && !node.parameters.metric) {
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
			partialExecutionVersion: 2,
			triggerToStartFrom: {
				name: triggerNode.name,
			},
		};

		// When in queue mode, we need to pass additional data to the execution
		// the same way as it would be passed in manual mode
		if (config.getEnv('executions.mode') === 'queue') {
			data.executionData = {
				resultData: {
					pinData,
					runData: {},
				},
				manualData: {
					userId: metadata.userId,
					partialExecutionVersion: 2,
					triggerToStartFrom: {
						name: triggerNode.name,
					},
				},
			};
		}

		// Trigger the workflow under test with mocked data
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		// Listen to the abort signal to stop the execution in case test run is cancelled
		abortSignal.addEventListener('abort', () => {
			this.activeExecutions.stopExecution(executionId);
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
			destinationNode: triggerNode.name,
			executionMode: 'manual',
			runData: {},
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
			partialExecutionVersion: 2,
			executionData: {
				startData: {
					destinationNode: triggerNode.name,
				},
				resultData: {
					runData: {},
				},
				manualData: {
					userId: metadata.userId,
					partialExecutionVersion: 2,
					triggerToStartFrom: {
						name: triggerNode.name,
					},
				},
			},
			triggerToStartFrom: {
				name: triggerNode.name,
			},
		};

		if (
			!(
				config.get('executions.mode') === 'queue' &&
				process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true'
			) &&
			data.executionData
		) {
			const nodeExecutionStack: IExecuteData[] = [];
			nodeExecutionStack.push({
				node: triggerNode,
				data: {
					main: [[{ json: {} }]],
				},
				source: null,
			});

			data.executionData.executionData = {
				contextData: {},
				metadata: {},
				// workflow does not evaluate correctly if this is passed in queue mode with offload manual executions
				// but this is expected otherwise in regular execution mode
				nodeExecutionStack,
				waitingExecution: {},
				waitingExecutionSource: {},
			};
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
	static getEvaluationMetricsNodes(workflow: IWorkflowBase) {
		return workflow.nodes.filter(
			(node) => node.type === EVALUATION_NODE_TYPE && node.parameters.operation === 'setMetrics',
		);
	}

	/**
	 * Get the evaluation set outputs nodes from a workflow.
	 */
	static getEvaluationSetOutputsNodes(workflow: IWorkflowBase) {
		return workflow.nodes.filter(
			(node) =>
				node.type === EVALUATION_NODE_TYPE &&
				(node.parameters.operation === 'setOutputs' || node.parameters.operation === undefined),
		);
	}

	/**
	 * Extract the dataset trigger output
	 */
	private extractDatasetTriggerOutput(execution: IRun, workflow: IWorkflowBase) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		assert(triggerNode);

		const triggerOutputData = execution.data.resultData.runData[triggerNode.name][0];

		if (triggerOutputData?.error) {
			throw new TestRunError('CANT_FETCH_TEST_CASES', {
				message: triggerOutputData.error.message,
			});
		}

		const triggerOutput = triggerOutputData?.data?.main?.[0];

		if (!triggerOutput || triggerOutput.length === 0) {
			throw new TestRunError('TEST_CASES_NOT_FOUND');
		}

		return triggerOutput;
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
	 * Creates a new test run for the given workflow
	 */
	async runTest(user: User, workflowId: string): Promise<void> {
		this.logger.debug('Starting new test run', { workflowId });

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
			// Update test run status
			await this.testRunRepository.markAsRunning(testRun.id);

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

			for (const testCase of testCases) {
				if (abortSignal.aborted) {
					telemetryMeta.status = 'cancelled';
					this.logger.debug('Test run was cancelled', {
						workflowId,
					});
					break;
				}

				this.logger.debug('Running test case');
				const runAt = new Date();

				try {
					const testCaseMetadata = {
						...testRunMetadata,
					};

					// Run the test case and wait for it to finish
					const testCaseResult = await this.runTestCase(
						workflow,
						testCaseMetadata,
						testCase,
						abortSignal,
					);
					assert(testCaseResult);

					const { executionId: testCaseExecutionId, executionData: testCaseExecution } =
						testCaseResult;

					assert(testCaseExecution);
					assert(testCaseExecutionId);

					this.logger.debug('Test case execution finished');

					// In case of a permission check issue, the test case execution will be undefined.
					// If that happens, or if the test case execution produced an error, mark the test case as failed.
					if (!testCaseExecution || testCaseExecution.data.resultData.error) {
						// Save the failed test case execution in DB
						await this.testCaseExecutionRepository.createTestCaseExecution({
							executionId: testCaseExecutionId,
							testRun: {
								id: testRun.id,
							},
							status: 'error',
							errorCode: 'FAILED_TO_EXECUTE_WORKFLOW',
							metrics: {},
						});
						telemetryMeta.errored_test_case_count++;
						continue;
					}
					const completedAt = new Date();

					// Collect common metrics
					const { addedMetrics: addedPredefinedMetrics } = metrics.addResults(
						this.extractPredefinedMetrics(testCaseExecution),
					);
					this.logger.debug('Test case common metrics extracted', addedPredefinedMetrics);

					// Collect user-defined metrics
					const { addedMetrics: addedUserDefinedMetrics } = metrics.addResults(
						this.extractUserDefinedMetrics(testCaseExecution, workflow),
					);

					if (Object.keys(addedUserDefinedMetrics).length === 0) {
						await this.testCaseExecutionRepository.createTestCaseExecution({
							executionId: testCaseExecutionId,
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'error',
							errorCode: 'NO_METRICS_COLLECTED',
						});
						telemetryMeta.errored_test_case_count++;
					} else {
						const combinedMetrics = {
							...addedUserDefinedMetrics,
							...addedPredefinedMetrics,
						};

						this.logger.debug(
							'Test case metrics extracted (user-defined)',
							addedUserDefinedMetrics,
						);

						// Create a new test case execution in DB
						await this.testCaseExecutionRepository.createTestCaseExecution({
							executionId: testCaseExecutionId,
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'success',
							metrics: combinedMetrics,
						});
					}
				} catch (e) {
					const completedAt = new Date();
					// FIXME: this is a temporary log
					this.logger.error('Test case execution failed', {
						workflowId,
						testRunId: testRun.id,
						error: e,
					});

					telemetryMeta.errored_test_case_count++;

					// In case of an unexpected error save it as failed test case execution and continue with the next test case
					if (e instanceof TestCaseExecutionError) {
						await this.testCaseExecutionRepository.createTestCaseExecution({
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'error',
							errorCode: e.code,
							errorDetails: e.extra as IDataObject,
						});
					} else {
						await this.testCaseExecutionRepository.createTestCaseExecution({
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'error',
							errorCode: 'UNKNOWN_ERROR',
						});

						// Report unexpected errors
						this.errorReporter.error(e);
					}
				}
			}

			// Mark the test run as completed or cancelled
			if (abortSignal.aborted) {
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
	 * Cancels the test run with the given ID.
	 * TODO: Implement the cancellation of the test run in a multi-main scenario
	 */
	async cancelTestRun(testRunId: string) {
		const abortController = this.abortControllers.get(testRunId);
		if (abortController) {
			abortController.abort();
			this.abortControllers.delete(testRunId);
		} else {
			const { manager: dbManager } = this.testRunRepository;

			// If there is no abort controller - just mark the test run and all its pending test case executions as cancelled
			await dbManager.transaction(async (trx) => {
				await this.testRunRepository.markAsCancelled(testRunId, trx);
				await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRunId, trx);
			});
		}
	}
}
