import { parse } from 'flatted';
import type { IPinData, IRun, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import assert from 'node:assert';
import { Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { IExecutionResponse } from '@/interfaces';
import { WorkflowRunner } from '@/workflow-runner';

/**
 * This service orchestrates the running of test cases.
 * It uses the test definitions to find
 * past executions, creates pin data from them,
 * and runs the workflow-under-test with the pin data.
 * TODO: Evaluation workflows
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
	) {}

	/**
	 * Creates a pin data object from the past execution data
	 * for the given workflow.
	 * For now, it only pins trigger nodes.
	 */
	private createPinDataFromExecution(
		workflow: WorkflowEntity,
		execution: ExecutionEntity,
	): IPinData {
		const executionData = parse(execution.executionData.data) as IExecutionResponse['data'];

		const triggerNodes = workflow.nodes.filter((node) => /trigger$/i.test(node.type));

		const pinData = {} as IPinData;

		for (const triggerNode of triggerNodes) {
			const triggerData = executionData.resultData.runData[triggerNode.name];
			if (triggerData?.[0]?.data?.main?.[0]) {
				pinData[triggerNode.name] = triggerData[0]?.data?.main?.[0];
			}
		}

		return pinData;
	}

	/**
	 * Runs a test case with the given pin data.
	 * Waits for the workflow under test to finish execution.
	 */
	private async runTestCase(
		workflow: WorkflowEntity,
		testCase: IPinData,
		userId: string,
	): Promise<IRun | undefined> {
		const data: IWorkflowExecutionDataProcess = {
			executionMode: 'evaluation',
			runData: {},
			pinData: testCase,
			workflowData: workflow,
			partialExecutionVersion: '-1',
			userId,
		};

		// Trigger the workflow under test with mocked data
		const executionId = await this.workflowRunner.run(data);
		assert(executionId);

		// Wait for the workflow to finish execution
		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);

		return await executePromise;
	}

	/**
	 * Creates a new test run for the given test definition.
	 */
	public async runTest(user: User, test: TestDefinition): Promise<void> {
		const workflow = await this.workflowRepository.findById(test.workflowId);
		assert(workflow, 'Workflow not found');

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

		// 2. Run the test cases

		for (const { id: pastExecutionId } of pastExecutions) {
			const pastExecution = await this.executionRepository.findOne({
				where: { id: pastExecutionId },
				relations: ['executionData', 'metadata'],
			});
			assert(pastExecution, 'Execution not found');

			const pinData = this.createPinDataFromExecution(workflow, pastExecution);

			// Run the test case and wait for it to finish
			const execution = await this.runTestCase(workflow, pinData, user.id);

			if (!execution) {
				continue;
			}

			// TODO: 2.3 Collect the run data
		}
	}
}
