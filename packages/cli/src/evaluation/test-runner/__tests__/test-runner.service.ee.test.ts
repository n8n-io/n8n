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
import type { TestDefinitionService } from '@/evaluation/test-definition.service.ee';
import type { WorkflowRunner } from '@/workflow-runner';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

mockInstance(ActiveExecutions);

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
		]);

		executionRepository.createQueryBuilder.mockReturnValueOnce(executionsQbMock);
	});

	test('should create an instance of TestRunnerService', async () => {
		const testRunnerService = new TestRunnerService(
			testDefinitionService,
			workflowRepository,
			workflowRunner,
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

		testDefinitionService.findOne
			.calledWith('some-test-id', expect.anything())
			.mockResolvedValueOnce(
				mock<TestDefinition>({
					id: 'some-test-id',
					workflowId: 'workflow-under-test-id',
					evaluationWorkflowId: 'evaluation-workflow-id',
					annotationTagId: 'some-annotation-tag-id',
				}),
			);

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRunner.run.mockResolvedValue('test-execution-id');

		await testRunnerService.runTest(mock<User>(), 'some-test-id', []);

		expect(executionRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
		expect(workflowRunner.run).toHaveBeenCalledTimes(2);
	});
});
