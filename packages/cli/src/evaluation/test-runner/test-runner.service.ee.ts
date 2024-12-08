import { parse } from 'flatted';
import type {
	IDataObject,
	IRun,
	IRunData,
	IRunExecutionData,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import assert from 'node:assert';
import { Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { TestMetricRepository } from '@/databases/repositories/test-metric.repository.ee';
import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { getRunData } from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

import { EvaluationMetrics } from './evaluation-metrics.ee';
import { createPinData, getPastExecutionTriggerNode } from './utils.ee';

/**
 * This service orchestrates the running of test cases.
 * It uses the test definitions to find
 * past executions, creates pin data from them,
 * and runs the workflow-under-test with the pin data.
 * After the workflow-under-test finishes, it runs the evaluation workflow
 * with the original and new run data.
 * TODO: Node pinning
 * TODO: Collect metrics
 */
@Service()
export class TestRunnerService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly executionRepository: ExecutionRepository,
		private readonly activeExecutions: ActiveExecutions,
		private readonly testRunRepository: TestRunRepository,
		private readonly testMetricRepository: TestMetricRepository,
	) {}

	/**
	 * Runs a test case with the given pin data.
	 * Waits for the workflow under test to finish execution.
	 */
	private async runTestCase(
		workflow: WorkflowEntity,
		pastExecutionData: IRunExecutionData,
		userId: string,
	): Promise<IRun | undefined> {
		// Create pin data from the past execution data
		const pinData = createPinData(workflow, pastExecutionData);

		// Determine the start node of the past execution
		const pastExecutionStartNode = getPastExecutionTriggerNode(pastExecutionData);

		// Prepare the data to run the workflow
		const data: IWorkflowExecutionDataProcess = {
			destinationNode: pastExecutionData.startData?.destinationNode,
			startNodes: pastExecutionStartNode
				? [{ name: pastExecutionStartNode, sourceData: null }]
				: undefined,
			executionMode: 'evaluation',
			runData: {},
			pinData,
			workflowData: workflow,
			partialExecutionVersion: '-1',
			userId,
		};

		// Trigger the workflow under test with mocked data
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

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
	) {
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
	public async runTest(user: User, test: TestDefinition): Promise<void> {
		const workflow = await this.workflowRepository.findById(test.workflowId);
		assert(workflow, 'Workflow not found');

		const evaluationWorkflow = await this.workflowRepository.findById(test.evaluationWorkflowId);
		assert(evaluationWorkflow, 'Evaluation workflow not found');

		// 0. Create new Test Run
		const testRun = await this.testRunRepository.createTestRun(test.id);
		assert(testRun, 'Unable to create a test run');

		// 1. Make test cases from previous executions

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

		// Get the metrics to collect from the evaluation workflow
		const testMetricNames = await this.getTestMetricNames(test.id);

		// 2. Run over all the test cases

		await this.testRunRepository.markAsRunning(testRun.id);

		// Object to collect the results of the evaluation workflow executions
		const metrics = new EvaluationMetrics(testMetricNames);

		for (const { id: pastExecutionId } of pastExecutions) {
			// Fetch past execution with data
			const pastExecution = await this.executionRepository.findOne({
				where: { id: pastExecutionId },
				relations: ['executionData', 'metadata'],
			});
			assert(pastExecution, 'Execution not found');

			const executionData = parse(pastExecution.executionData.data) as IRunExecutionData;

			// Run the test case and wait for it to finish
			const testCaseExecution = await this.runTestCase(workflow, executionData, user.id);

			// In case of a permission check issue, the test case execution will be undefined.
			// Skip them and continue with the next test case
			if (!testCaseExecution) {
				continue;
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
			);
			assert(evalExecution);

			// Extract the output of the last node executed in the evaluation workflow
			metrics.addResults(this.extractEvaluationResult(evalExecution));
		}

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		await this.testRunRepository.markAsCompleted(testRun.id, aggregatedMetrics);
	}
}
