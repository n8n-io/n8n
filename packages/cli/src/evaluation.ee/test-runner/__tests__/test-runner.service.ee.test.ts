import type { TestRun } from '@n8n/db';
import type { TestCaseExecutionRepository } from '@n8n/db';
import type { TestRunRepository } from '@n8n/db';
import type { WorkflowRepository } from '@n8n/db';
import { readFileSync } from 'fs';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { ITaskData } from 'n8n-workflow';
import type { ExecutionError, IRun } from 'n8n-workflow';
import path from 'path';

import type { ActiveExecutions } from '@/active-executions';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import { mockInstance, mockLogger } from '@test/mocking';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

function mockExecutionData() {
	return mock<IRun>({
		data: {
			resultData: {
				runData: {
					'When clicking ‘Execute workflow’': mock<ITaskData[]>(),
				},
				// error is an optional prop, but jest-mock-extended will mock it by default,
				// which affects the code logic. So, we need to explicitly set it to undefined.
				error: undefined,
			},
		},
	});
}

function mockErrorExecutionData() {
	return mock<IRun>({
		data: {
			resultData: {
				error: mock<ExecutionError>(),
			},
		},
	});
}

const errorReporter = mock<ErrorReporter>();
const logger = mockLogger();
const telemetry = mock<Telemetry>();

describe('TestRunnerService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const testRunRepository = mock<TestRunRepository>();
	const testCaseExecutionRepository = mock<TestCaseExecutionRepository>();

	// const mockNodeTypes = mockInstance(NodeTypes);
	mockInstance(LoadNodesAndCredentials, {
		loadedNodes: mockNodeTypesData(['manualTrigger', 'set', 'if', 'code', 'evaluation']),
	});

	beforeEach(() => {
		testRunRepository.createTestRun.mockResolvedValue(mock<TestRun>({ id: 'test-run-id' }));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	test('should create an instance of TestRunnerService', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			errorReporter,
		);

		expect(testRunnerService).toBeInstanceOf(TestRunnerService);
	});
});
