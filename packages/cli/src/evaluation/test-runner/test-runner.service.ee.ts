import { parse } from 'flatted';
import type {
	IDataObject,
	IPinData,
	IRun,
	IRunData,
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
import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { IExecutionResponse } from '@/interfaces';
import { getRunData } from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

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
	) {}

	/**
	 * Extracts the execution data from the past execution.
	 * Creates a pin data object from the past execution data
	 * for the given workflow.
	 * For now, it only pins trigger nodes.
	 */
	private createTestDataFromExecution(workflow: WorkflowEntity, execution: ExecutionEntity) {
		const executionData = parse(execution.executionData.data) as IExecutionResponse['data'];

		const triggerNodes = workflow.nodes.filter((node) => /trigger$/i.test(node.type));

		const pinData = {} as IPinData;

		for (const triggerNode of triggerNodes) {
			const triggerData = executionData.resultData.runData[triggerNode.name];
			if (triggerData?.[0]?.data?.main?.[0]) {
				pinData[triggerNode.name] = triggerData[0]?.data?.main?.[0];
			}
		}

		return { pinData, executionData };
	}

	/**
	 * Runs a test case with the given pin data.
	 * Waits for the workflow under test to finish execution.
	 */
	private async runTestCase(
		workflow: WorkflowEntity,
		testCasePinData: IPinData,
		userId: string,
	): Promise<IRun | undefined> {
		// Prepare the data to run the workflow
		const data: IWorkflowExecutionDataProcess = {
			executionMode: 'evaluation',
			runData: {},
			pinData: testCasePinData,
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

		// 2. Run over all the test cases

		await this.testRunRepository.markAsRunning(testRun.id);

		const metrics = [];

		for (const { id: pastExecutionId } of pastExecutions) {
			// Fetch past execution with data
			const pastExecution = await this.executionRepository.findOne({
				where: { id: pastExecutionId },
				relations: ['executionData', 'metadata'],
			});
			assert(pastExecution, 'Execution not found');

			const testData = this.createTestDataFromExecution(workflow, pastExecution);
			const { pinData, executionData } = testData;

			// Run the test case and wait for it to finish
			const testCaseExecution = await this.runTestCase(workflow, pinData, user.id);

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
			metrics.push(this.extractEvaluationResult(evalExecution));
		}

		// TODO: 3. Aggregate the results
		// Now we just set success to true if all the test cases passed
		const aggregatedMetrics = { success: metrics.every((metric) => metric.success) };

		await this.testRunRepository.markAsCompleted(testRun.id, aggregatedMetrics);
	}
}
