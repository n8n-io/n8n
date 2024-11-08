import { parse } from 'flatted';
import type { IPinData, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import assert from 'node:assert';
import { Container, Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import type { User } from '@/databases/entities/user';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TestDefinitionService } from '@/evaluation/test-definition.service.ee';
import type { IExecutionDb, IExecutionResponse } from '@/interfaces';
import { WorkflowRunner } from '@/workflow-runner';
// import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

@Service()
export class TestRunnerService {
	constructor(
		private readonly testDefinitionsService: TestDefinitionService,
		private readonly workflowRepository: WorkflowRepository,
		// private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly executionRepository: ExecutionRepository,
	) {}

	public async runTest(user: User, testId: number, accessibleWorkflowIds: string[]): Promise<any> {
		const test = await this.testDefinitionsService.findOne(testId, accessibleWorkflowIds);

		console.log({ test });

		if (!test) {
			throw new NotFoundError('Test definition not found');
		}

		const workflow = await this.workflowRepository.findById(test.workflowId);
		assert(workflow, 'Workflow not found');

		// Make a list of test cases
		// const executions = await this.executionRepository.findManyByRangeQuery({
		// 	kind: 'range',
		// 	range: {
		// 		limit: 99,
		// 	},
		// 	annotationTags: [test.annotationTagId],
		// 	accessibleWorkflowIds,
		// });
		const executions = await this.executionRepository
			.createQueryBuilder('execution')
			.leftJoin('execution.annotation', 'annotation')
			.leftJoin('annotation.tags', 'annotationTag')
			.leftJoinAndSelect('execution.executionData', 'executionData')
			.leftJoinAndSelect('execution.metadata', 'metadata')
			.where('annotationTag.id = :tagId', { tagId: test.annotationTagId })
			.andWhere('execution.workflowId = :workflowId', { workflowId: test.workflowId })
			.getMany();

		const testCases = executions.map((execution) => {
			const executionData = parse(execution.executionData.data) as IExecutionResponse['data'];

			return {
				pinData: {
					'When clicking ‘Test workflow’':
						executionData.resultData.runData['When clicking ‘Test workflow’'][0]?.data?.main?.[0],
				} as IPinData,
			};
		});

		console.log({ testCases });

		for (const testCase of testCases) {
			// Start the workflow
			const data: IWorkflowExecutionDataProcess = {
				executionMode: 'evaluation',
				runData: {},
				pinData: testCase.pinData,
				workflowData: workflow,
				userId: user.id,
				partialExecutionVersion: '-1',
			};

			// if (pinnedTrigger && !hasRunData(pinnedTrigger)) {
			// 	data.startNodes = [{ name: pinnedTrigger.name, sourceData: null }];
			// }

			const executionId = await this.workflowRunner.run(data);

			assert(executionId);

			const executePromise = Container.get(ActiveExecutions).getPostExecutePromise(
				executionId,
			) as Promise<IExecutionDb | undefined>;

			const execution = await executePromise;
			console.log({ execution });
			console.log(execution?.data.resultData.runData.Code?.[0].data?.main[0]);
		}

		return { success: true };
	}
}
