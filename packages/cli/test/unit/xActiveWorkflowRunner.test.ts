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
import type { User } from '@/databases/entities/User';

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

	// test.only('should check that every workflow can be activated', async () => {
	// 	const spy = jest
	// 		.spyOn(Workflow.prototype, 'checkIfWorkflowCanBeActivated')
	// 		.mockReturnValue(true);

	// 	const workflows = generateWorkflows(2);
	// 	workflowRepository.getAllActive.mockResolvedValue(workflows);
	// 	workflowRepository.find.mockResolvedValue(workflows); // @TODO: Remove?

	// 	await activeWorkflowRunner.init();

	// 	expect(spy).toHaveBeenCalledTimes(2);
	// });
});
