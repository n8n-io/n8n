import type { SelectQueryBuilder } from '@n8n/typeorm';
import { stringify } from 'flatted';
import { readFileSync } from 'fs';
import { mock, mockDeep } from 'jest-mock-extended';
import { mockInstance } from 'n8n-core/test/utils';
import path from 'path';

import { ActiveExecutions } from '@/active-executions';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import type { User } from '@/databases/entities/user';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { WorkflowRunner } from '@/workflow-runner';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

mockInstance(ActiveExecutions);

const executionMocks = [
	mock<ExecutionEntity>({
		id: 'some-execution-id',
		workflowId: 'workflow-under-test-id',
		status: 'success',
		executionData: {
			data: stringify(executionDataJson),
		},
	}),
	mock<ExecutionEntity>({
		id: 'some-execution-id-2',
		workflowId: 'workflow-under-test-id',
		status: 'success',
		executionData: {
			data: stringify(executionDataJson),
		},
	}),
];

describe('TestRunnerService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();

	beforeEach(() => {
		const executionsQbMock = mockDeep<SelectQueryBuilder<ExecutionEntity>>({
			fallbackMockImplementation: jest.fn().mockReturnThis(),
		});

		executionsQbMock.getMany.mockResolvedValueOnce(executionMocks);
		executionRepository.createQueryBuilder.mockReturnValueOnce(executionsQbMock);
		executionRepository.findOne
			.calledWith(expect.objectContaining({ where: { id: 'some-execution-id' } }))
			.mockResolvedValueOnce(executionMocks[0]);
		executionRepository.findOne
			.calledWith(expect.objectContaining({ where: { id: 'some-execution-id-2' } }))
			.mockResolvedValueOnce(executionMocks[1]);
	});

	test('should create an instance of TestRunnerService', async () => {
		const testRunnerService = new TestRunnerService(
			workflowRepository,
			workflowRunner,
			executionRepository,
		);

		expect(testRunnerService).toBeInstanceOf(TestRunnerService);
	});

	test('should create and run test cases from past executions', async () => {
		const testRunnerService = new TestRunnerService(
			workflowRepository,
			workflowRunner,
			executionRepository,
		);

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRunner.run.mockResolvedValue('test-execution-id');

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
			}),
		);

		expect(executionRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
		expect(executionRepository.findOne).toHaveBeenCalledTimes(2);
		expect(workflowRunner.run).toHaveBeenCalledTimes(2);
	});
});
