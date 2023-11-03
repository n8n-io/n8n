import { NodeApiError, NodeOperationError, Workflow } from 'n8n-workflow';
import { Container } from 'typedi';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { ExternalHooks } from '@/ExternalHooks';
import { Push } from '@/push';
import { ActiveExecutions } from '@/ActiveExecutions';
import { SecretsHelper } from '@/SecretsHelpers';
import { WebhookService } from '@/services/webhook.service';
import { mockInstance } from '../integration/shared/utils';
import * as testDb from '../integration/shared/testDb';
import { ActiveWorkflows } from 'n8n-core';
import { WorkflowRepository } from '@/databases/repositories';
import { setSchedulerAsLoadedNode } from './Helpers';
import * as AdditionalData from '@/WorkflowExecuteAdditionalData';
import type { User } from '@/databases/entities/User';
import { WorkflowRunner } from '@/WorkflowRunner';

mockInstance(ActiveExecutions);
mockInstance(ActiveWorkflows);
mockInstance(WebhookService);
mockInstance(Push);
mockInstance(SecretsHelper);

setSchedulerAsLoadedNode();

const externalHooks = mockInstance(ExternalHooks);

let activeWorkflowRunner: ActiveWorkflowRunner;
let workflowRepository: WorkflowRepository;
let owner: User;

beforeAll(async () => {
	await testDb.init();

	activeWorkflowRunner = Container.get(ActiveWorkflowRunner);
	workflowRepository = Container.get(WorkflowRepository);
	owner = await testDb.createOwner();
});

afterEach(async () => {
	await testDb.truncate(['Workflow']);

	activeWorkflowRunner.activeWorkflows = new ActiveWorkflows();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('init()', () => {
	test('should call external hooks', async () => {
		await activeWorkflowRunner.init();

		expect(externalHooks.run).toHaveBeenCalledTimes(1);
	});

	test('should start with no active workflows', async () => {
		const findSpy = jest.spyOn(workflowRepository, 'find');

		await activeWorkflowRunner.init();

		const activated = activeWorkflowRunner.getActiveWorkflows();
		await expect(activated).resolves.toHaveLength(0);
		expect(findSpy).toHaveBeenCalled();
	});

	test('should start with one active workflow', async () => {
		await testDb.createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();

		const activated = activeWorkflowRunner.getActiveWorkflows();
		await expect(activated).resolves.toHaveLength(1);
	});

	test('should start with multiple active workflows', async () => {
		await testDb.createWorkflow({ active: true }, owner);
		await testDb.createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();

		const activated = activeWorkflowRunner.getActiveWorkflows();
		await expect(activated).resolves.toHaveLength(2);
	});

	test('should pre-check that every workflow can be activated', async () => {
		await testDb.createWorkflow({ active: true }, owner);
		await testDb.createWorkflow({ active: true }, owner);

		const precheckSpy = jest
			.spyOn(Workflow.prototype, 'checkIfWorkflowCanBeActivated')
			.mockReturnValue(true);

		await activeWorkflowRunner.init();

		expect(precheckSpy).toHaveBeenCalledTimes(2);
	});
});

describe('removeAll()', () => {
	test('should remove all active workflows', async () => {
		await testDb.createWorkflow({ active: true }, owner);
		await testDb.createWorkflow({ active: true }, owner);

		const removeSpy = jest.spyOn(activeWorkflowRunner, 'remove');

		await activeWorkflowRunner.init();
		await activeWorkflowRunner.removeAll();

		expect(removeSpy).toHaveBeenCalledTimes(2);

		/**
		 * We do not assert using `ActiveWorkflowRunner.getActiveWorkflows()` because
		 * this method is for workflows stored as `active` in the DB, i.e. workflows that
		 * should be activated whenever n8n is running).
		 *
		 * Workflows stored as `active` are **not** the same as actually active workflows.
		 */
	});
});

describe('remove()', () => {
	test('should remove workflow webhooks', async () => {
		const workflow = await testDb.createWorkflow({ active: true }, owner);

		const removeWebhooksSpy = jest.spyOn(activeWorkflowRunner, 'removeWorkflowWebhooks');

		await activeWorkflowRunner.init();
		await activeWorkflowRunner.remove(workflow.id);

		expect(removeWebhooksSpy).toHaveBeenCalledTimes(1);
	});
});

describe('isActive()', () => {
	test('should return true for workflow stored as active', async () => {
		const workflow = await testDb.createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();

		const isActive = activeWorkflowRunner.isActive(workflow.id);
		await expect(isActive).resolves.toBe(true);
	});

	test('should return true for workflow stored as active', async () => {
		const workflow = await testDb.createWorkflow({ active: false }, owner);

		await activeWorkflowRunner.init();

		const isActive = activeWorkflowRunner.isActive(workflow.id);
		await expect(isActive).resolves.toBe(false);
	});
});

describe('runWorkflow()', () => {
	test('should call WorkflowRunner.run()', async () => {
		const workflow = await testDb.createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();

		const additionalData = await AdditionalData.getBase('fake-user-id');

		const runSpy = jest
			.spyOn(WorkflowRunner.prototype, 'run')
			.mockResolvedValue('fake-execution-id');

		const [node] = workflow.nodes;

		await activeWorkflowRunner.runWorkflow(workflow, node, [[]], additionalData, 'trigger');

		expect(runSpy).toHaveBeenCalledTimes(1);
	});
});

describe('executeErrorWorkflow()', () => {
	test('should call WorkflowExecuteAdditionalData.executeErrorWorkflow()', async () => {
		const workflow = await testDb.createWorkflow({ active: true }, owner);
		const [node] = workflow.nodes;
		const error = new NodeOperationError(node, 'Fake error message');
		const executeErrorWorkflowSpy = jest.spyOn(AdditionalData, 'executeErrorWorkflow');

		await activeWorkflowRunner.init();

		activeWorkflowRunner.executeErrorWorkflow(error, workflow, 'trigger');

		expect(executeErrorWorkflowSpy).toHaveBeenCalledTimes(1);
	});

	it('should be called on failure to activate due to 401', async () => {
		const storedWorkflow = await testDb.createWorkflow({ active: true }, owner);
		const [node] = storedWorkflow.nodes;

		jest.spyOn(activeWorkflowRunner, 'add').mockImplementation(() => {
			throw new NodeApiError(node, {
				httpCode: '401',
				message: 'Authorization failed - please check your credentials',
			});
		});

		const executeErrorWorkflowSpy = jest.spyOn(activeWorkflowRunner, 'executeErrorWorkflow');

		await activeWorkflowRunner.init();

		const [error, workflow] = executeErrorWorkflowSpy.mock.calls[0];

		expect(error.message).toContain('Authorization');
		expect(workflow.id).toBe(storedWorkflow.id);
	});
});
