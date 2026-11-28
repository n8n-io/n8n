import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { AssistantUsageEvent } from '../database/assistant-usage-event.entity';
import { AssistantUsageRepository } from '../database/assistant-usage.repository';

let repository: AssistantUsageRepository;
let alice: User;
let project: Project;

const events = () => Container.get(DataSource).getRepository(AssistantUsageEvent);

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	repository = Container.get(AssistantUsageRepository);
});
beforeEach(async () => {
	alice = await createUser({ firstName: 'Alice', lastName: 'Archer' });
	project = await createTeamProject();
});
afterEach(async () => {
	await events().clear();
});
afterAll(async () => await testDb.terminate());

describe('AssistantUsageRepository', () => {
	it('records a message', async () => {
		await repository.addMessage({ userId: alice.id, threadId: 't-1', projectId: project.id }, {});

		await expect(events().find()).resolves.toEqual([
			expect.objectContaining({
				type: 'message',
				userId: alice.id,
				threadId: 't-1',
				projectId: project.id,
				resourceId: null,
				inputTokens: null,
			}),
		]);
	});

	it('records a created resource once, however often it is reported', async () => {
		const created = {
			type: 'agent-created' as const,
			userId: alice.id,
			threadId: 't-1',
			projectId: null,
			resourceId: 'agent-1',
		};
		await repository.addCreatedResource(created, {});
		await repository.addCreatedResource({ ...created, threadId: 't-2' }, {});
		// The same ID with another resource type is another resource.
		await repository.addCreatedResource({ ...created, type: 'workflow-created' }, {});

		const rows = await events().find({ order: { id: 'ASC' } });
		expect(rows.map((row) => [row.type, row.threadId, row.resourceId])).toEqual([
			['agent-created', 't-1', 'agent-1'],
			['workflow-created', 't-1', 'agent-1'],
		]);
	});

	it('records the tokens of each model as one row', async () => {
		const scope = { userId: alice.id, threadId: 't-1', projectId: null };
		await repository.addTokenUsage(
			[
				{
					...scope,
					model: 'anthropic/claude-sonnet-4-5',
					inputTokens: 1500,
					outputTokens: 75,
					cacheReadTokens: 1000,
					cacheWriteTokens: 300,
				},
				{
					...scope,
					model: 'anthropic/claude-haiku-4-5',
					inputTokens: 600,
					outputTokens: 18,
					cacheReadTokens: 0,
					cacheWriteTokens: 0,
				},
			],
			{},
		);
		await repository.addTokenUsage([], {});

		await expect(events().find({ order: { id: 'ASC' } })).resolves.toEqual([
			expect.objectContaining({
				type: 'token-usage',
				model: 'anthropic/claude-sonnet-4-5',
				inputTokens: 1500,
				outputTokens: 75,
				cacheReadTokens: 1000,
				cacheWriteTokens: 300,
				resourceId: null,
			}),
			expect.objectContaining({ type: 'token-usage', model: 'anthropic/claude-haiku-4-5' }),
		]);
	});

	it('keeps the records of a deleted project', async () => {
		await repository.addMessage({ userId: alice.id, threadId: 't-1', projectId: project.id }, {});

		await Container.get(ProjectRepository).delete({ id: project.id });

		await expect(events().find()).resolves.toEqual([
			expect.objectContaining({ userId: alice.id, threadId: 't-1', projectId: null }),
		]);
	});

	it('deletes the events created before a date', async () => {
		const message = {
			type: 'message' as const,
			userId: alice.id,
			projectId: null,
			resourceId: null,
		};
		await events().insert([
			{ ...message, threadId: 't-1', createdAt: new Date('2025-01-01T00:00:00.000Z') },
			{ ...message, threadId: 't-2', createdAt: new Date('2026-11-10T00:00:00.000Z') },
		]);

		await expect(
			repository.deleteCreatedBefore(new Date('2026-01-01T00:00:00.000Z'), {}),
		).resolves.toBe(1);
		await expect(events().find()).resolves.toEqual([expect.objectContaining({ threadId: 't-2' })]);
	});
});
