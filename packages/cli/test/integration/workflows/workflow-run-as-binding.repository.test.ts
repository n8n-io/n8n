import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { IWorkflowDb, User } from '@n8n/db';
import { UserRepository, WorkflowRunAsBindingRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '../shared/db/users';

describe('WorkflowRunAsBindingRepository', () => {
	let repository: WorkflowRunAsBindingRepository;
	let owner: User;
	let member: User;
	let workflow: IWorkflowDb;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowRunAsBindingRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowRunAsBinding', 'WorkflowEntity', 'User']);
		owner = await createOwner();
		member = await createMember();
		workflow = await createWorkflow();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('insertActive then findActiveByWorkflowId returns the row', async () => {
		await repository.insertActive({ workflowId: workflow.id, userId: owner.id, setBy: owner.id });

		const binding = await repository.findActiveByWorkflowId(workflow.id);

		expect(binding).toMatchObject({
			workflowId: workflow.id,
			userId: owner.id,
			setBy: owner.id,
			status: 'active',
		});
	});

	test('revokeActive flips status and findActiveByWorkflowId returns null', async () => {
		await repository.insertActive({ workflowId: workflow.id, userId: owner.id, setBy: owner.id });

		const affected = await repository.revokeActive(workflow.id);

		expect(affected).toBe(1);
		expect(await repository.findActiveByWorkflowId(workflow.id)).toBeNull();
	});

	test('a second insertActive while one is active fails on the partial unique index', async () => {
		await repository.insertActive({ workflowId: workflow.id, userId: owner.id, setBy: owner.id });

		await expect(
			repository.insertActive({ workflowId: workflow.id, userId: member.id, setBy: member.id }),
		).rejects.toThrow();
	});

	test('insertActive after revokeActive succeeds', async () => {
		await repository.insertActive({ workflowId: workflow.id, userId: owner.id, setBy: owner.id });
		await repository.revokeActive(workflow.id);

		await repository.insertActive({ workflowId: workflow.id, userId: member.id, setBy: member.id });

		const binding = await repository.findActiveByWorkflowId(workflow.id);
		expect(binding).toMatchObject({
			workflowId: workflow.id,
			userId: member.id,
			setBy: member.id,
			status: 'active',
		});
	});

	test('deleting the user cascades the binding', async () => {
		await repository.insertActive({ workflowId: workflow.id, userId: member.id, setBy: owner.id });

		await Container.get(UserRepository).delete(member.id);

		const binding = await repository.findActiveByWorkflowId(workflow.id);
		expect(binding).toBeNull();
	});
});
