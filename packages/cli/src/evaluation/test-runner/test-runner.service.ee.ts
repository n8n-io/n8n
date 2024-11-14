import { parse } from 'flatted';
import type { IPinData, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import assert from 'node:assert';
import { Container, Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TestDefinitionService } from '@/evaluation/test-definition.service.ee';
import type { IExecutionDb, IExecutionResponse } from '@/interfaces';
import { WorkflowRunner } from '@/workflow-runner';

@Service()
export class TestRunnerService {
	constructor(
		private readonly testDefinitionsService: TestDefinitionService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly executionRepository: ExecutionRepository,
	) {}

	private createPinDataFromExecution(
		workflow: WorkflowEntity,
		execution: ExecutionEntity,
	): IPinData {
		const executionData = parse(execution.executionData.data) as IExecutionResponse['data'];

		const triggerNodes = workflow.nodes.filter((node) => /trigger$/i.test(node.type));

		const pinData = {} as IPinData;

		for (const triggerNode of triggerNodes) {
			const triggerData = executionData.resultData.runData[triggerNode.name];
			if (triggerData[0]?.data?.main?.[0]) {
				pinData[triggerNode.name] = triggerData[0]?.data?.main?.[0];
			}
		}

		return pinData;
	}

	public async runTest(user: User, testId: number, accessibleWorkflowIds: string[]): Promise<any> {
		const test = await this.testDefinitionsService.findOne(testId, accessibleWorkflowIds);

		if (!test) {
			throw new NotFoundError('Test definition not found');
		}

		const workflow = await this.workflowRepository.findById(test.workflowId);
		assert(workflow, 'Workflow not found');

		const executions = await this.executionRepository
			.createQueryBuilder('execution')
			.leftJoin('execution.annotation', 'annotation')
			.leftJoin('annotation.tags', 'annotationTag')
			.leftJoinAndSelect('execution.executionData', 'executionData')
			.leftJoinAndSelect('execution.metadata', 'metadata')
			.where('annotationTag.id = :tagId', { tagId: test.annotationTagId })
			.andWhere('execution.workflowId = :workflowId', { workflowId: test.workflowId })
			.getMany();

		const testCases = executions.map((execution) =>
			this.createPinDataFromExecution(workflow, execution),
		);

		for (const testCase of testCases) {
			// Start the workflow
			const data: IWorkflowExecutionDataProcess = {
				executionMode: 'evaluation',
				runData: {},
				pinData: testCase,
				workflowData: workflow,
				userId: user.id,
				partialExecutionVersion: '-1',
			};

			const executionId = await this.workflowRunner.run(data);

			assert(executionId);

			const executePromise = Container.get(ActiveExecutions).getPostExecutePromise(
				executionId,
			) as Promise<IExecutionDb | undefined>;

			const execution = await executePromise;
		}

		return { success: true };
	}
}
