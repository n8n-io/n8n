import type { User, ExecutionEntity, MockedNodeItem, TestDefinition, TestRun } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { parse } from 'flatted';
import difference from 'lodash/difference';
import { ErrorReporter, Logger } from 'n8n-core';
import { ExecutionCancelledError, NodeConnectionTypes, Workflow } from 'n8n-workflow';
import type {
	AssignmentCollectionValue,
	IDataObject,
	IRun,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import assert from 'node:assert';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { EVALUATION_METRICS_NODE } from '@/constants';
import { TestCaseExecutionRepository } from '@/databases/repositories/test-case-execution.repository.ee';
import { TestMetricRepository } from '@/databases/repositories/test-metric.repository.ee';
import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import * as Db from '@/db';
import { TestCaseExecutionError, TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { getRunData } from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

import { EvaluationMetrics } from './evaluation-metrics.ee';
import {
	createPinData,
	formatTestCaseExecutionInputData,
	getPastExecutionTriggerNode,
} from './utils.ee';

export interface TestRunMetadata {
	testRunId: string;
	userId: string;
}

export interface TestCaseRunMetadata extends TestRunMetadata {
	pastExecutionId: string;
	annotation: ExecutionEntity['annotation'];
	highlightedData: ExecutionEntity['metadata'];
}

/**
 * This service orchestrates the running of test cases.
 * It uses the test definitions to find
 * past executions, creates pin data from them,
 * and runs the workflow-under-test with the pin data.
 * After the workflow-under-test finishes, it runs the evaluation workflow
 * with the original and new run data, and collects the metrics.
 */
@Service()
export class TestRunnerService {
	private abortControllers: Map<TestRun['id'], AbortController> = new Map();

	constructor(
		private readonly logger: Logger,
		private readonly telemetry: Telemetry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly executionRepository: ExecutionRepository,
		private readonly activeExecutions: ActiveExecutions,
		private readonly testRunRepository: TestRunRepository,
		private readonly testCaseExecutionRepository: TestCaseExecutionRepository,
		private readonly testMetricRepository: TestMetricRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly errorReporter: ErrorReporter,
	) {}

	/**
	 * As Test Runner does not have a recovery mechanism, it can not resume Test Runs interrupted by the server restart.
	 * All Test Runs in incomplete state will be marked as cancelled.
	 */
	async cleanupIncompleteRuns() {
		await this.testRunRepository.markAllIncompleteAsFailed();
	}

	/**
	 * Prepares the start nodes and trigger node data props for the `workflowRunner.run` method input.
	 */
	private getStartNodesData(
		workflow: IWorkflowBase,
		pastExecutionData: IRunExecutionData,
		pastExecutionWorkflowData: IWorkflowBase,
	): Pick<IWorkflowExecutionDataProcess, 'startNodes' | 'triggerToStartFrom'> {
		// Create a new workflow instance to use the helper functions (getChildNodes)
		const workflowInstance = new Workflow({
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: false,
			nodeTypes: this.nodeTypes,
		});

		// Create a map between node IDs and node names for the past workflow
		const pastWorkflowNodeIdByName = new Map(
			pastExecutionWorkflowData.nodes.map((node) => [node.name, node.id]),
		);

		// Create a map between node names and IDs for the up-to-date workflow
		const workflowNodeNameById = new Map(workflow.nodes.map((node) => [node.id, node.name]));

		// Determine the trigger node of the past execution
		const pastExecutionTriggerNode = getPastExecutionTriggerNode(pastExecutionData);
		assert(pastExecutionTriggerNode, 'Could not find the trigger node of the past execution');

		const pastExecutionTriggerNodeId = pastWorkflowNodeIdByName.get(pastExecutionTriggerNode);
		assert(pastExecutionTriggerNodeId, 'Could not find the trigger node ID of the past execution');

		// Check the trigger is still present in the workflow
		const triggerNode = workflowNodeNameById.get(pastExecutionTriggerNodeId);
		if (!triggerNode) {
			throw new TestCaseExecutionError('TRIGGER_NO_LONGER_EXISTS');
		}

		const triggerNodeData = pastExecutionData.resultData.runData[pastExecutionTriggerNode][0];
		assert(triggerNodeData, 'Trigger node data not found');

		const triggerToStartFrom = {
			name: triggerNode,
			data: triggerNodeData,
		};

		// Start nodes are the nodes that are connected to the trigger node
		const startNodes = workflowInstance
			.getChildNodes(triggerNode, NodeConnectionTypes.Main, 1)
			.map((nodeName) => ({
				name: nodeName,
				sourceData: { previousNode: pastExecutionTriggerNode },
			}));

		return {
			startNodes,
			triggerToStartFrom,
		};
	}

	/**
	 * Runs a test case with the given pin data.
	 * Waits for the workflow under test to finish execution.
	 */
	private async runTestCase(
		workflow: IWorkflowBase,
		pastExecutionData: IRunExecutionData,
		pastExecutionWorkflowData: IWorkflowBase,
		mockedNodes: MockedNodeItem[],
		metadata: TestCaseRunMetadata,
		abortSignal: AbortSignal,
	): Promise<IRun | undefined> {
		// Do not run if the test run is cancelled
		if (abortSignal.aborted) {
			return;
		}

		// Create pin data from the past execution data
		const pinData = createPinData(
			workflow,
			mockedNodes,
			pastExecutionData,
			pastExecutionWorkflowData,
		);

		const startNodesData = this.getStartNodesData(
			workflow,
			pastExecutionData,
			pastExecutionWorkflowData,
		);

		// Prepare the data to run the workflow
		// Evaluation executions should run the same way as manual,
		// because they need pinned data and partial execution logic
		const data: IWorkflowExecutionDataProcess = {
			...startNodesData,
			executionMode: 'evaluation',
			runData: {},
			pinData,
			workflowData: { ...workflow, pinData },
			userId: metadata.userId,
			partialExecutionVersion: 2,
		};

		// When in queue mode, we need to pass additional data to the execution
		// the same way as it would be passed in manual mode
		if (config.getEnv('executions.mode') === 'queue') {
			data.executionData = {
				startData: {
					startNodes: startNodesData.startNodes,
				},
				resultData: {
					pinData,
					runData: {},
				},
				manualData: {
					userId: metadata.userId,
					partialExecutionVersion: 2,
					triggerToStartFrom: startNodesData.triggerToStartFrom,
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

		// Update status of the test run execution mapping
		await this.testCaseExecutionRepository.markAsRunning({
			testRunId: metadata.testRunId,
			pastExecutionId: metadata.pastExecutionId,
			executionId,
		});

		// Wait for the execution to finish
		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

		return await executePromise;
	}

	/**
	 * Sync the metrics of the test definition with the evaluation workflow.
	 */
	async syncMetrics(
		testDefinitionId: string,
		evaluationWorkflow: IWorkflowBase,
	): Promise<Set<string>> {
		const usedTestMetricNames = await this.getUsedTestMetricNames(evaluationWorkflow);
		const existingTestMetrics = await this.testMetricRepository.find({
			where: {
				testDefinition: { id: testDefinitionId },
			},
		});

		const existingMetricNames = new Set(existingTestMetrics.map((metric) => metric.name));
		const metricsToAdd = difference(
			Array.from(usedTestMetricNames),
			Array.from(existingMetricNames),
		);
		const metricsToRemove = difference(
			Array.from(existingMetricNames),
			Array.from(usedTestMetricNames),
		);

		// Add new metrics
		const metricsToAddEntities = metricsToAdd.map((metricName) =>
			this.testMetricRepository.create({
				name: metricName,
				testDefinition: { id: testDefinitionId },
			}),
		);
		await this.testMetricRepository.save(metricsToAddEntities);

		// Remove no longer used metrics
		metricsToRemove.forEach(async (metricName) => {
			const metric = existingTestMetrics.find((m) => m.name === metricName);
			assert(metric, 'Existing metric not found');

			await this.testMetricRepository.delete(metric.id);
		});

		return usedTestMetricNames;
	}

	/**
	 * Run the evaluation workflow with the expected and actual run data.
	 */
	private async runTestCaseEvaluation(
		evaluationWorkflow: IWorkflowBase,
		evaluationInputData: any,
		abortSignal: AbortSignal,
		metadata: TestCaseRunMetadata,
	) {
		// Do not run if the test run is cancelled
		if (abortSignal.aborted) {
			return;
		}

		// Prepare the data to run the evaluation workflow
		const data = await getRunData(evaluationWorkflow, [evaluationInputData]);
		data.executionMode = 'integrated';

		// Trigger the evaluation workflow
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		// Listen to the abort signal to stop the execution in case test run is cancelled
		abortSignal.addEventListener('abort', () => {
			this.activeExecutions.stopExecution(executionId);
		});

		// Update status of the test run execution mapping
		await this.testCaseExecutionRepository.markAsEvaluationRunning({
			testRunId: metadata.testRunId,
			pastExecutionId: metadata.pastExecutionId,
			evaluationExecutionId: executionId,
		});

		// Wait for the execution to finish
		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

		return await executePromise;
	}

	/**
	 * Get the evaluation metrics nodes from a workflow.
	 */
	static getEvaluationMetricsNodes(workflow: IWorkflowBase) {
		return workflow.nodes.filter((node) => node.type === EVALUATION_METRICS_NODE);
	}

	/**
	 * Evaluation result is the first item in the output of the last node
	 * executed in the evaluation workflow. Defaults to an empty object
	 * in case the node doesn't produce any output items.
	 */
	private extractEvaluationResult(execution: IRun, evaluationWorkflow: IWorkflowBase): IDataObject {
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
		assert(lastNodeExecuted, 'Could not find the last node executed in evaluation workflow');
		const metricsNodes = TestRunnerService.getEvaluationMetricsNodes(evaluationWorkflow);
		const metricsRunData = metricsNodes.flatMap(
			(node) => execution.data.resultData.runData[node.name],
		);
		const metricsData = metricsRunData.reverse().map((data) => data.data?.main?.[0]?.[0]?.json);
		const metricsResult = metricsData.reduce((acc, curr) => ({ ...acc, ...curr }), {}) ?? {};

		return metricsResult;
	}

	/**
	 * Get the metrics to collect from the evaluation workflow execution results.
	 */
	private async getUsedTestMetricNames(evaluationWorkflow: IWorkflowBase) {
		const metricsNodes = TestRunnerService.getEvaluationMetricsNodes(evaluationWorkflow);
		const metrics = metricsNodes.map((node) => {
			const metricsParameter = node.parameters?.metrics as AssignmentCollectionValue;
			assert(metricsParameter, 'Metrics parameter not found');

			const metricsNames = metricsParameter.assignments.map((assignment) => assignment.name);
			return metricsNames;
		});

		return new Set(metrics.flat());
	}

	/**
	 * Creates a new test run for the given test definition.
	 */
	async runTest(user: User, test: TestDefinition): Promise<void> {
		this.logger.debug('Starting new test run', { testId: test.id });

		const workflow = await this.workflowRepository.findById(test.workflowId);
		assert(workflow, 'Workflow not found');

		// 0. Create new Test Run
		const testRun = await this.testRunRepository.createTestRun(test.id);
		assert(testRun, 'Unable to create a test run');

		// 0.1 Initialize AbortController
		const abortController = new AbortController();
		this.abortControllers.set(testRun.id, abortController);

		// 0.2 Initialize metadata
		// This will be passed to the test case executions
		const testRunMetadata = {
			testRunId: testRun.id,
			userId: user.id,
		};

		let testRunEndStatusForTelemetry;

		const abortSignal = abortController.signal;
		try {
			// Get the evaluation workflow
			const evaluationWorkflow = await this.workflowRepository.findById(test.evaluationWorkflowId);
			if (!evaluationWorkflow) {
				throw new TestRunError('EVALUATION_WORKFLOW_NOT_FOUND');
			}
			///
			// 1. Make test cases from previous executions
			///

			// Select executions with the annotation tag and workflow ID of the test.
			// Fetch only ids to reduce the data transfer.
			const pastExecutions: ReadonlyArray<Pick<ExecutionEntity, 'id'>> =
				await this.executionRepository
					.createQueryBuilder('execution')
					.select('execution.id')
					.leftJoin('execution.annotation', 'annotation')
					.leftJoin('annotation.tags', 'annotationTag')
					.where('annotationTag.id = :tagId', { tagId: test.annotationTagId })
					.andWhere('execution.workflowId = :workflowId', { workflowId: test.workflowId })
					.getMany();

			this.logger.debug('Found past executions', { count: pastExecutions.length });

			if (pastExecutions.length === 0) {
				throw new TestRunError('PAST_EXECUTIONS_NOT_FOUND');
			}

			// Add all past executions mappings to the test run.
			// This will be used to track the status of each test case and keep the connection between test run and all related executions (past, current, and evaluation).
			await this.testCaseExecutionRepository.createBatch(
				testRun.id,
				pastExecutions.map((e) => e.id),
			);

			// Sync the metrics of the test definition with the evaluation workflow
			const testMetricNames = await this.syncMetrics(test.id, evaluationWorkflow);

			// 2. Run over all the test cases
			const pastExecutionIds = pastExecutions.map((e) => e.id);

			// Update test run status
			await this.testRunRepository.markAsRunning(testRun.id, pastExecutions.length);

			this.telemetry.track('User ran test', {
				user_id: user.id,
				test_id: test.id,
				run_id: testRun.id,
				executions_ids: pastExecutionIds,
				workflow_id: test.workflowId,
				evaluation_workflow_id: test.evaluationWorkflowId,
			});

			// Initialize object to collect the results of the evaluation workflow executions
			const metrics = new EvaluationMetrics(testMetricNames);

			///
			// 2. Run over all the test cases
			///

			for (const pastExecutionId of pastExecutionIds) {
				if (abortSignal.aborted) {
					this.logger.debug('Test run was cancelled', {
						testId: test.id,
						stoppedOn: pastExecutionId,
					});
					break;
				}

				this.logger.debug('Running test case', { pastExecutionId });

				try {
					// Fetch past execution with data
					const pastExecution = await this.executionRepository.findOne({
						where: { id: pastExecutionId },
						relations: ['executionData', 'metadata', 'annotation', 'annotation.tags'],
					});
					assert(pastExecution, 'Execution not found');

					const executionData = parse(pastExecution.executionData.data) as IRunExecutionData;

					const testCaseMetadata = {
						...testRunMetadata,
						pastExecutionId,
						highlightedData: pastExecution.metadata,
						annotation: pastExecution.annotation,
					};

					// Run the test case and wait for it to finish
					const testCaseExecution = await this.runTestCase(
						workflow,
						executionData,
						pastExecution.executionData.workflowData,
						test.mockedNodes,
						testCaseMetadata,
						abortSignal,
					);

					this.logger.debug('Test case execution finished', { pastExecutionId });

					// In case of a permission check issue, the test case execution will be undefined.
					// If that happens, or if the test case execution produced an error, mark the test case as failed.
					if (!testCaseExecution || testCaseExecution.data.resultData.error) {
						await Db.transaction(async (trx) => {
							await this.testRunRepository.incrementFailed(testRun.id, trx);
							await this.testCaseExecutionRepository.markAsFailed({
								testRunId: testRun.id,
								pastExecutionId,
								errorCode: 'FAILED_TO_EXECUTE_WORKFLOW',
								trx,
							});
						});
						continue;
					}

					// Collect the results of the test case execution
					const testCaseRunData = testCaseExecution.data.resultData.runData;

					// Get the original runData from the test case execution data
					const originalRunData = executionData.resultData.runData;

					const evaluationInputData = formatTestCaseExecutionInputData(
						originalRunData,
						pastExecution.executionData.workflowData,
						testCaseRunData,
						workflow,
						testCaseMetadata,
					);

					// Run the evaluation workflow with the original and new run data
					const evalExecution = await this.runTestCaseEvaluation(
						evaluationWorkflow,
						evaluationInputData,
						abortSignal,
						testCaseMetadata,
					);
					assert(evalExecution);

					this.logger.debug('Evaluation execution finished', { pastExecutionId });

					// Extract the output of the last node executed in the evaluation workflow
					const { addedMetrics } = metrics.addResults(
						this.extractEvaluationResult(evalExecution, evaluationWorkflow),
					);

					if (evalExecution.data.resultData.error) {
						await Db.transaction(async (trx) => {
							await this.testRunRepository.incrementFailed(testRun.id, trx);
							await this.testCaseExecutionRepository.markAsFailed({
								testRunId: testRun.id,
								pastExecutionId,
								errorCode: 'FAILED_TO_EXECUTE_EVALUATION_WORKFLOW',
								trx,
							});
						});
					} else {
						await Db.transaction(async (trx) => {
							await this.testRunRepository.incrementPassed(testRun.id, trx);

							await this.testCaseExecutionRepository.markAsCompleted({
								testRunId: testRun.id,
								pastExecutionId,
								metrics: addedMetrics,
								trx,
							});
						});
					}
				} catch (e) {
					// In case of an unexpected error, increment the failed count and continue with the next test case
					await Db.transaction(async (trx) => {
						await this.testRunRepository.incrementFailed(testRun.id, trx);

						if (e instanceof TestCaseExecutionError) {
							await this.testCaseExecutionRepository.markAsFailed({
								testRunId: testRun.id,
								pastExecutionId,
								errorCode: e.code,
								errorDetails: e.extra as IDataObject,
								trx,
							});
						} else {
							await this.testCaseExecutionRepository.markAsFailed({
								testRunId: testRun.id,
								pastExecutionId,
								errorCode: 'UNKNOWN_ERROR',
								trx,
							});

							// Report unexpected errors
							this.errorReporter.error(e);
						}
					});
				}
			}

			// Mark the test run as completed or cancelled
			if (abortSignal.aborted) {
				await Db.transaction(async (trx) => {
					await this.testRunRepository.markAsCancelled(testRun.id, trx);
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRun.id, trx);

					testRunEndStatusForTelemetry = 'cancelled';
				});
			} else {
				const aggregatedMetrics = metrics.getAggregatedMetrics();

				await this.testRunRepository.markAsCompleted(testRun.id, aggregatedMetrics);

				this.logger.debug('Test run finished', { testId: test.id, testRunId: testRun.id });

				testRunEndStatusForTelemetry = 'completed';
			}
		} catch (e) {
			if (e instanceof ExecutionCancelledError) {
				this.logger.debug('Evaluation execution was cancelled. Cancelling test run', {
					testRunId: testRun.id,
					stoppedOn: e.extra?.executionId,
				});

				await Db.transaction(async (trx) => {
					await this.testRunRepository.markAsCancelled(testRun.id, trx);
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRun.id, trx);
				});

				testRunEndStatusForTelemetry = 'cancelled';
			} else if (e instanceof TestRunError) {
				await this.testRunRepository.markAsError(testRun.id, e.code, e.extra as IDataObject);
				testRunEndStatusForTelemetry = 'error';
			} else {
				await this.testRunRepository.markAsError(testRun.id, 'UNKNOWN_ERROR');
				testRunEndStatusForTelemetry = 'error';
				throw e;
			}
		} finally {
			// Clean up abort controller
			this.abortControllers.delete(testRun.id);

			// Send telemetry event
			this.telemetry.track('Test run finished', {
				test_id: test.id,
				run_id: testRun.id,
				status: testRunEndStatusForTelemetry,
			});
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
			// If there is no abort controller - just mark the test run and all its' pending test case executions as cancelled
			await Db.transaction(async (trx) => {
				await this.testRunRepository.markAsCancelled(testRunId, trx);
				await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRunId, trx);
			});
		}
	}

	/**
	 * Returns the example evaluation WF input for the test definition.
	 * It uses the latest execution of a workflow under test as a source and formats it
	 * the same way as the evaluation input would be formatted.
	 * We explicitly provide annotation tag here (and DO NOT use the one from DB), because the test definition
	 * might not be saved to the DB with the updated annotation tag at the moment we need to get the example data.
	 */
	async getExampleEvaluationInputData(test: TestDefinition, annotationTagId: string) {
		// Select the id of latest execution with the annotation tag and workflow ID of the test
		const lastPastExecution: Pick<ExecutionEntity, 'id'> | null = await this.executionRepository
			.createQueryBuilder('execution')
			.select('execution.id')
			.leftJoin('execution.annotation', 'annotation')
			.leftJoin('annotation.tags', 'annotationTag')
			.where('annotationTag.id = :tagId', { tagId: annotationTagId })
			.andWhere('execution.workflowId = :workflowId', { workflowId: test.workflowId })
			.orderBy('execution.createdAt', 'DESC')
			.getOne();

		if (lastPastExecution === null) {
			return null;
		}

		// Fetch past execution with data
		const pastExecution = await this.executionRepository.findOne({
			where: {
				id: lastPastExecution.id,
			},
			relations: ['executionData', 'metadata', 'annotation', 'annotation.tags'],
		});
		assert(pastExecution, 'Execution not found');

		const executionData = parse(pastExecution.executionData.data) as IRunExecutionData;

		const sampleTestCaseMetadata = {
			testRunId: 'sample-test-run-id',
			userId: 'sample-user-id',
			pastExecutionId: lastPastExecution.id,
			highlightedData: pastExecution.metadata,
			annotation: pastExecution.annotation,
		};

		// Get the original runData from the test case execution data
		const originalRunData = executionData.resultData.runData;

		// We use the same execution data for the original and new run data format example
		const evaluationInputData = formatTestCaseExecutionInputData(
			originalRunData,
			pastExecution.executionData.workflowData,
			originalRunData,
			pastExecution.executionData.workflowData,
			sampleTestCaseMetadata,
		);

		return evaluationInputData.json;
	}
}
