import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ModuleRegistry } from '@n8n/backend-common';
import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { DbConnection, User, UserRepository, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { WorkflowBuilderSession, WorkflowBuilderSessionRepository } from '../index';

let repository: WorkflowBuilderSessionRepository;
let dataSource: DataSource;

beforeAll(async () => {
	await testModules.loadModules(['workflow-builder'], {
		'workflow-builder': async () => await import('../workflow-builder.module.js'),
	});
	expect(Container.get(ModuleRegistry).entities).toContain(WorkflowBuilderSession);
	expect(Container.get(DbConnection).connectionState.connected).toBe(false);
	await testDb.init();
	dataSource = Container.get(DataSource);
	repository = Container.get(WorkflowBuilderSessionRepository);
});

beforeEach(async () => {
	await repository.delete({});
});

afterAll(async () => {
	await testDb.terminate();
});

async function createSessionOwner() {
	const user = await Container.get(UserRepository).save({ role: { slug: 'global:owner' } });
	const workflow = await createWorkflow();
	return { user, workflow, threadId: `workflow-${workflow.id}-user-${user.id}` };
}

describe('packaged session persistence', () => {
	it('resolves relations to the shared database entities', () => {
		const metadata = dataSource.getMetadata(WorkflowBuilderSession);
		expect(metadata.tableNameWithoutPrefix).toBe('workflow_builder_session');
		expect(metadata.findRelationWithPropertyPath('workflow')?.inverseEntityMetadata.target).toBe(
			WorkflowEntity,
		);
		expect(metadata.findRelationWithPropertyPath('user')?.inverseEntityMetadata.target).toBe(User);
	});

	it('saves, restores, and updates one session for both thread formats', async () => {
		const { user, workflow, threadId } = await createSessionOwner();
		const messages = [new HumanMessage('Build a workflow'), new AIMessage('Workflow ready')];
		await repository.saveSession(threadId, {
			messages,
			previousSummary: 'Workflow summary',
			updatedAt: new Date(),
			activeVersionCardId: 'version-card',
			resumeAfterRestoreMessageId: 'resume-message',
		});

		expect(await repository.getSession(`${threadId}-code`)).toEqual({
			messages,
			previousSummary: 'Workflow summary',
			updatedAt: expect.any(Date),
			activeVersionCardId: 'version-card',
			resumeAfterRestoreMessageId: 'resume-message',
		});
		const original = await repository.findOneByOrFail({ workflowId: workflow.id, userId: user.id });
		expect(original.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(original.createdAt).toBeInstanceOf(Date);
		expect(original.updatedAt).toBeInstanceOf(Date);
		expect(original.messages.map((message) => message.type)).toEqual(['human', 'ai']);

		await repository.saveSession(`${threadId}-code`, {
			messages: [new HumanMessage('Update the workflow')],
			updatedAt: new Date(),
		});
		expect(await repository.count()).toBe(1);
		expect(await repository.findOneByOrFail({ id: original.id })).toMatchObject({
			createdAt: original.createdAt,
			previousSummary: null,
			activeVersionCardId: null,
			resumeAfterRestoreMessageId: null,
		});
		expect(await repository.getSession(threadId)).toMatchObject({
			messages: [new HumanMessage('Update the workflow')],
			previousSummary: undefined,
		});

		await repository.deleteSession(`${threadId}-code`);
		expect(await repository.getSession(threadId)).toBeNull();
	});

	it('generates an ID and enforces the workflow and user uniqueness rule', async () => {
		const { user, workflow } = await createSessionOwner();
		const values = { workflowId: workflow.id, userId: user.id, messages: [] };
		const entity = await repository.save(repository.create(values));
		expect(entity.id).toMatch(/^[0-9a-f-]{36}$/);
		await expect(repository.save(repository.create(values))).rejects.toThrow(/unique/i);
	});

	it.each(['workflow', 'user'] as const)(
		'removes sessions when the %s is removed',
		async (owner) => {
			const { user, workflow, threadId } = await createSessionOwner();
			await repository.saveSession(threadId, { messages: [], updatedAt: new Date() });
			if (owner === 'workflow') {
				await Container.get(WorkflowRepository).delete(workflow.id);
			} else {
				await Container.get(UserRepository).delete(user.id);
			}
			expect(await repository.getSession(threadId)).toBeNull();
		},
	);
});
