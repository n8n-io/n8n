import { Service } from '@n8n/di';
import { parse } from 'flatted';
import { ErrorReporter, Logger } from 'n8n-core';
import { ExecutionCancelledError, NodeConnectionType, Workflow } from 'n8n-workflow';
import type {
	IDataObject,
	IRun,
	IRunData,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import assert from 'node:assert';

import { ActiveExecutions } from '@/active-executions';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { MockedNodeItem, TestDefinition } from '@/databases/entities/test-definition.ee';
import type { TestRun } from '@/databases/entities/test-run.ee';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { TestCaseExecutionRepository } from '@/databases/repositories/test-case-execution.repository.ee';
import { TestMetricRepository } from '@/databases/repositories/test-metric.repository.ee';
import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import * as Db from '@/db';
import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { getRunData } from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

import { EvaluationMetrics } from './evaluation-metrics.ee';
import { createPinData, getPastExecutionTriggerNode } from './utils.ee';

interface TestRunMetadata {
	testRunId: string;
	userId: string;
}

interface TestCaseRunMetadata extends TestRunMetadata {
	pastExecutionId: string;
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
	 * Prepares the start nodes and trigger node data props for the `workflowRunner.run` method input.
	 */
	private getStartNodesData(
		workflow: WorkflowEntity,
		pastExecutionData: IRunExecutionData,
	): Pick<IWorkflowExecutionDataProcess, 'startNodes' | 'triggerToStartFrom'> {
		// Create a new workflow instance to use the helper functions (getChildNodes)
		const workflowInstance = new Workflow({
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: false,
			nodeTypes: this.nodeTypes,
		});

		// Determine the trigger node of the past execution
		const pastExecutionTriggerNode = getPastExecutionTriggerNode(pastExecutionData);
		assert(pastExecutionTriggerNode, 'Could not find the trigger node of the past execution');

		const triggerNodeData = pastExecutionData.resultData.runData[pastExecutionTriggerNode][0];
		assert(triggerNodeData, 'Trigger node data not found');

		const triggerToStartFrom = {
			name: pastExecutionTriggerNode,
			data: triggerNodeData,
		};

		// Start nodes are the nodes that are connected to the trigger node
		const startNodes = workflowInstance
			.getChildNodes(pastExecutionTriggerNode, NodeConnectionType.Main, 1)
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
		workflow: WorkflowEntity,
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

		// Prepare the data to run the workflow
		const data: IWorkflowExecutionDataProcess = {
			...this.getStartNodesData(workflow, pastExecutionData),
			executionMode: 'evaluation',
			runData: {},
			pinData,
			workflowData: { ...workflow, pinData },
			userId: metadata.userId,
			partialExecutionVersion: '1',
		};

		// Trigger the workflow under test with mocked data
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		// Listen to the abort signal to stop the execution in case test run is cancelled
		abortSignal.addEventListener('abort', () => {
			this.activeExecutions.stopExecution(executionId);
		});

		// Update status of the test run execution mapping
		await this.testCaseExecutionRepository.markAsRunning(
			metadata.testRunId,
			metadata.pastExecutionId,
			executionId,
		);

		// Wait for the execution to finish
		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

		return await executePromise;
	}

	/**
	 * Run the evaluation workflow with the expected and actual run data.
	 */
	private async runTestCaseEvaluation(
		evaluationWorkflow: WorkflowEntity,
		expectedData: IRunData,
		actualData: IRunData,
		abortSignal: AbortSignal,
		metadata: TestCaseRunMetadata,
	) {
		// Do not run if the test run is cancelled
		if (abortSignal.aborted) {
			return;
		}

		// Prepare the evaluation wf input data.
		// Provide both the expected data and the actual data
		const evaluationInputData = {
			json: {
				originalExecution: expectedData,
				newExecution: actualData,
			},
		};

		// Prepare the data to run the evaluation workflow
		const data = await getRunData(evaluationWorkflow, [evaluationInputData]);
		data.executionMode = 'evaluation';

		// Trigger the evaluation workflow
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		// Listen to the abort signal to stop the execution in case test run is cancelled
		abortSignal.addEventListener('abort', () => {
			this.activeExecutions.stopExecution(executionId);
		});

		// Update status of the test run execution mapping
		await this.testCaseExecutionRepository.markAsEvaluationRunning(
			metadata.testRunId,
			metadata.pastExecutionId,
			executionId,
		);

		// Wait for the execution to finish
		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

		return await executePromise;
	}

	/**
	 * Evaluation result is the first item in the output of the last node
	 * executed in the evaluation workflow. Defaults to an empty object
	 * in case the node doesn't produce any output items.
	 */
	private extractEvaluationResult(execution: IRun): IDataObject {
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
		assert(lastNodeExecuted, 'Could not find the last node executed in evaluation workflow');

		// Extract the output of the last node executed in the evaluation workflow
		// We use only the first item of a first main output
		const lastNodeTaskData = execution.data.resultData.runData[lastNodeExecuted]?.[0];
		const mainConnectionData = lastNodeTaskData?.data?.main?.[0];
		return mainConnectionData?.[0]?.json ?? {};
	}

	/**
	 * Get the metrics to collect from the evaluation workflow execution results.
	 */
	private async getTestMetricNames(testDefinitionId: string) {
		const metrics = await this.testMetricRepository.find({
			where: {
				testDefinition: {
					id: testDefinitionId,
				},
			},
		});

		return new Set(metrics.map((m) => m.name));
	}

	/**
	 * Creates a new test run for the given test definition.
	 */
	async runTest(user: User, test: TestDefinition): Promise<void> {
		this.logger.debug('Starting new test run', { testId: test.id });

		const workflow = await this.workflowRepository.findById(test.workflowId);
		assert(workflow, 'Workflow not found');

		const evaluationWorkflow = await this.workflowRepository.findById(test.evaluationWorkflowId);
		assert(evaluationWorkflow, 'Evaluation workflow not found');

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

		const abortSignal = abortController.signal;
		try {
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

			// Add all past executions mappings to the test run.
			// This will be used to track the status of each test case and keep the connection between test run and all related executions (past, current, and evaluation).
			await this.testCaseExecutionRepository.createBatch(
				testRun.id,
				pastExecutions.map((e) => e.id),
			);

			// Get the metrics to collect from the evaluation workflow
			const testMetricNames = await this.getTestMetricNames(test.id);

			// 2. Run over all the test cases
			const pastExecutionIds = pastExecutions.map((e) => e.id);

			// Update test run status
			await this.testRunRepository.markAsRunning(testRun.id, pastExecutions.length);

			this.telemetry.track('User runs test', {
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
						relations: ['executionData', 'metadata'],
					});
					assert(pastExecution, 'Execution not found');

					const executionData = parse(pastExecution.executionData.data) as IRunExecutionData;

					const testCaseMetadata = {
						...testRunMetadata,
						pastExecutionId,
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
					// Skip them, increment the failed count and continue with the next test case
					if (!testCaseExecution) {
						await Db.transaction(async (trx) => {
							await this.testRunRepository.incrementFailed(testRun.id, trx);
							await this.testCaseExecutionRepository.markAsFailed(testRun.id, pastExecutionId, trx);
						});
						continue;
					}

					// Update status of the test case execution mapping entry in case of an error
					if (testCaseExecution.data.resultData.error) {
						await this.testCaseExecutionRepository.markAsFailed(testRun.id, pastExecutionId);
					}

					// Collect the results of the test case execution
					const testCaseRunData = testCaseExecution.data.resultData.runData;

					// Get the original runData from the test case execution data
					const originalRunData = executionData.resultData.runData;

					// Run the evaluation workflow with the original and new run data
					const evalExecution = await this.runTestCaseEvaluation(
						evaluationWorkflow,
						originalRunData,
						testCaseRunData,
						abortSignal,
						testCaseMetadata,
					);
					assert(evalExecution);

					this.logger.debug('Evaluation execution finished', { pastExecutionId });

					// Extract the output of the last node executed in the evaluation workflow
					const addedMetrics = metrics.addResults(this.extractEvaluationResult(evalExecution));

					if (evalExecution.data.resultData.error) {
						await Db.transaction(async (trx) => {
							await this.testRunRepository.incrementFailed(testRun.id, trx);
							await this.testCaseExecutionRepository.markAsFailed(testRun.id, pastExecutionId, trx);
						});
					} else {
						await Db.transaction(async (trx) => {
							await this.testRunRepository.incrementPassed(testRun.id, trx);
							await this.testCaseExecutionRepository.markAsCompleted(
								testRun.id,
								pastExecutionId,
								addedMetrics,
								trx,
							);
						});
					}
				} catch (e) {
					// In case of an unexpected error, increment the failed count and continue with the next test case
					await Db.transaction(async (trx) => {
						await this.testRunRepository.incrementFailed(testRun.id, trx);
						await this.testCaseExecutionRepository.markAsFailed(testRun.id, pastExecutionId, trx);
					});

					this.errorReporter.error(e);
				}
			}

			// Mark the test run as completed or cancelled
			if (abortSignal.aborted) {
				await Db.transaction(async (trx) => {
					await this.testRunRepository.markAsCancelled(testRun.id, trx);
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRun.id, trx);
				});
			} else {
				const aggregatedMetrics = metrics.getAggregatedMetrics();
				await this.testRunRepository.markAsCompleted(testRun.id, aggregatedMetrics);

				this.logger.debug('Test run finished', { testId: test.id });
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
			} else {
				throw e;
			}
		} finally {
			// Clean up abort controller
			this.abortControllers.delete(testRun.id);
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
}
