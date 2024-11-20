import { stringify } from 'flatted';
import { readFileSync } from 'fs';
import { mock, mockDeep } from 'jest-mock-extended';
import { mockInstance } from 'n8n-core/test/utils';
import path from 'path';

import { ActiveExecutions } from '@/active-executions';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { TestDefinitionService } from '@/evaluation/test-definition.service.ee';
import type { WorkflowRunner } from '@/workflow-runner';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json')),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json')),
);

const activeExecutions = mockInstance(ActiveExecutions);

describe('TestRunnerService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const testDefinitionService = mock<TestDefinitionService>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();

	beforeEach(() => {
		const executionsQbMock = mockDeep<SelectQueryBuilder<ExecutionEntity>>({
			fallbackMockImplementation: jest.fn().mockReturnThis(),
		});

		executionsQbMock.getMany.mockResolvedValueOnce([
			{
				id: 'some-execution-id',
				workflowId: 'workflow-under-test-id',
				status: 'success',
				finishedAt: new Date(),
				executionData: {
					data: stringify(executionDataJson),
				},
			},
			{
				id: 'some-execution-id-2',
				workflowId: 'workflow-under-test-id',
				status: 'success',
				finishedAt: new Date(),
				executionData: {
					data: stringify(executionDataJson),
				},
			},
		]);

		executionRepository.createQueryBuilder.mockReturnValueOnce(executionsQbMock);
	});

	test('should create an instance of TestRunnerService', async () => {
		const testRunnerService = new TestRunnerService(
			testDefinitionService,
			workflowRepository,
			executionRepository,
		);

		expect(testRunnerService).toBeInstanceOf(TestRunnerService);
	});

	test('should create and run test cases from past executions', async () => {
		const testRunnerService = new TestRunnerService(
			testDefinitionService,
			workflowRepository,
			workflowRunner,
			executionRepository,
		);

		testDefinitionService.findOne.calledWith('some-test-id').mockResolvedValueOnce({
			id: 'some-test-id',
			workflowId: 'workflow-under-test-id',
			evaluationWorkflowId: 'evaluation-workflow-id',
			annotationTagId: 'some-annotation-tag-id',
		});

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRunner.run.mockResolvedValue('test-execution-id');

		await testRunnerService.runTest(mock<User>(), 'some-test-id');

		expect(executionRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
		expect(workflowRunner.run).toHaveBeenCalledTimes(2);
	});
});
