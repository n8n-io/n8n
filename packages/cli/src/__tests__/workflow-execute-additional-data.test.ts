import { mock } from 'jest-mock-extended';
import type {
	IExecuteWorkflowInfo,
	IWorkflowExecuteAdditionalData,
	ExecuteWorkflowOptions,
	IRun,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';
import Container from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsHelper } from '@/credentials-helper';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { VariablesService } from '@/environments/variables/variables.service.ee';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { SecretsHelper } from '@/secrets-helpers';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { SubworkflowPolicyChecker } from '@/subworkflows/subworkflow-policy-checker.service';
import { Telemetry } from '@/telemetry';
import { PermissionChecker } from '@/user-management/permission-checker';
import { executeWorkflow, getBase } from '@/workflow-execute-additional-data';
import { mockInstance } from '@test/mocking';

const run = mock<IRun>({
	data: { resultData: {} },
	finished: true,
	mode: 'manual',
	startedAt: new Date(),
	status: 'new',
});

const cancelablePromise = mock<PCancelable<IRun>>({
	then: jest
		.fn()
		.mockImplementation(async (onfulfilled) => await Promise.resolve(run).then(onfulfilled)),
	catch: jest
		.fn()
		.mockImplementation(async (onrejected) => await Promise.resolve(run).catch(onrejected)),
	finally: jest
		.fn()
		.mockImplementation(async (onfinally) => await Promise.resolve(run).finally(onfinally)),
	[Symbol.toStringTag]: 'PCancelable',
});

jest.mock('n8n-core', () => ({
	__esModule: true,
	...jest.requireActual('n8n-core'),
	WorkflowExecute: jest.fn().mockImplementation(() => ({
		processRunExecutionData: jest.fn().mockReturnValue(cancelablePromise),
	})),
}));

jest.mock('../workflow-helpers', () => ({
	...jest.requireActual('../workflow-helpers'),
	getDataLastExecutedNodeData: jest.fn().mockReturnValue({ data: { main: [] } }),
}));

describe('WorkflowExecuteAdditionalData', () => {
	const variablesService = mockInstance(VariablesService);
	variablesService.getAllCached.mockResolvedValue([]);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const secretsHelper = mockInstance(SecretsHelper);
	const eventService = mockInstance(EventService);
	mockInstance(ExternalHooks);
	Container.set(VariablesService, variablesService);
	Container.set(CredentialsHelper, credentialsHelper);
	Container.set(SecretsHelper, secretsHelper);
	const executionRepository = mockInstance(ExecutionRepository);
	mockInstance(Telemetry);
	const workflowRepository = mockInstance(WorkflowRepository);
	const activeExecutions = mockInstance(ActiveExecutions);
	mockInstance(PermissionChecker);
	mockInstance(SubworkflowPolicyChecker);
	mockInstance(WorkflowStatisticsService);

	test('logAiEvent should call MessageEventBus', async () => {
		const additionalData = await getBase('user-id');

		const eventName = 'ai-messages-retrieved-from-memory';
		const payload = {
			msg: 'test message',
			executionId: '123',
			nodeName: 'n8n-memory',
			workflowId: 'workflow-id',
			workflowName: 'workflow-name',
			nodeType: 'n8n-memory',
		};

		additionalData.logAiEvent(eventName, payload);

		expect(eventService.emit).toHaveBeenCalledTimes(1);
		expect(eventService.emit).toHaveBeenCalledWith(eventName, payload);
	});

	it('`executeWorkflow` should set subworkflow execution as running', async () => {
		const executionId = '123';
		workflowRepository.get.mockResolvedValue(mock<WorkflowEntity>({ id: executionId, nodes: [] }));
		activeExecutions.add.mockResolvedValue(executionId);

		await executeWorkflow(
			mock<IExecuteWorkflowInfo>(),
			mock<IWorkflowExecuteAdditionalData>(),
			mock<ExecuteWorkflowOptions>({ loadedWorkflowData: undefined }),
		);

		expect(executionRepository.setRunning).toHaveBeenCalledWith(executionId);
	});
});
