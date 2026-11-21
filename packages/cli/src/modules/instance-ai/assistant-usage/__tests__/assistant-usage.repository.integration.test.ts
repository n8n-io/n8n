import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { AssistantUsageEvent } from '../database/assistant-usage-event.entity';
import { AssistantUsageRepository } from '../database/assistant-usage.repository';

let repository: AssistantUsageRepository;
let alice: User;
let bob: User;
let project: Project;

const range = {
	startDate: new Date('2026-11-01T00:00:00.000Z'),
	endDate: new Date('2026-11-30T23:59:59.999Z'),
};

async function insertEvent(
	event: Pick<AssistantUsageEvent, 'type' | 'userId' | 'threadId' | 'createdAt'> &
		Partial<Pick<AssistantUsageEvent, 'projectId' | 'resourceId'>>,
) {
	await Container.get(DataSource)
		.getRepository(AssistantUsageEvent)
		.insert({ projectId: null, resourceId: null, ...event });
}

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	repository = Container.get(AssistantUsageRepository);
});
beforeEach(async () => {
	alice = await createUser({ firstName: 'Alice', lastName: 'Archer' });
	bob = await createUser({ firstName: 'Bob', lastName: 'Baker' });
	project = await createTeamProject();
});
afterEach(async () => {
	await Container.get(DataSource).getRepository(AssistantUsageEvent).clear();
});
afterAll(async () => await testDb.terminate());

describe('AssistantUsageRepository', () => {
	it('counts messages, conversations, active users and created resources in the range', async () => {
		const at = new Date('2026-11-10T10:00:00.000Z');
		await insertEvent({ type: 'message', userId: alice.id, threadId: 't-1', createdAt: at });
		await insertEvent({ type: 'message', userId: alice.id, threadId: 't-1', createdAt: at });
		await insertEvent({ type: 'message', userId: bob.id, threadId: 't-2', createdAt: at });
		await insertEvent({
			type: 'workflow-created',
			userId: alice.id,
			threadId: 't-1',
			resourceId: 'wf-1',
			createdAt: at,
		});
		await insertEvent({
			type: 'data-table-created',
			userId: bob.id,
			threadId: 't-2',
			resourceId: 'dt-1',
			createdAt: at,
		});
		// Outside the range.
		await insertEvent({
			type: 'message',
			userId: bob.id,
			threadId: 't-3',
			createdAt: new Date('2026-10-31T23:59:59.000Z'),
		});

		await expect(repository.summarize(range, {})).resolves.toEqual({
			conversations: 2,
			messages: 3,
			activeUsers: 2,
			workflowsCreated: 1,
			agentsCreated: 0,
			dataTablesCreated: 1,
		});
	});

	it('counts only the usage in the project when the range has one', async () => {
		const at = new Date('2026-11-10T10:00:00.000Z');
		await insertEvent({
			type: 'message',
			userId: alice.id,
			threadId: 't-1',
			projectId: project.id,
			createdAt: at,
		});
		await insertEvent({ type: 'message', userId: bob.id, threadId: 't-2', createdAt: at });

		const summary = await repository.summarize({ ...range, projectId: project.id }, {});

		expect(summary).toMatchObject({ messages: 1, activeUsers: 1 });
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
		await repository.addMessage({ userId: alice.id, threadId: 't-1', projectId: null }, {});
		await repository.addMessage({ userId: alice.id, threadId: 't-1', projectId: null }, {});

		const now = {
			startDate: new Date(Date.now() - 60_000),
			endDate: new Date(Date.now() + 60_000),
		};
		await expect(repository.summarize(now, {})).resolves.toMatchObject({
			messages: 2,
			agentsCreated: 1,
		});
	});

	it('buckets the days in the requested time zone', async () => {
		// 23:30 UTC is already the next day in Berlin, which is UTC+1 in November.
		const lateEvening = new Date('2026-11-10T23:30:00.000Z');
		await insertEvent({
			type: 'message',
			userId: alice.id,
			threadId: 't-1',
			createdAt: lateEvening,
		});
		await insertEvent({
			type: 'message',
			userId: bob.id,
			threadId: 't-2',
			createdAt: new Date('2026-11-12T08:00:00.000Z'),
		});

		const utc = await repository.countByDay(range, 'UTC', {});
		const berlin = await repository.countByDay(range, 'Europe/Berlin', {});

		expect(utc.map((day) => [day.date, day.messages])).toEqual([
			['2026-11-10', 1],
			['2026-11-12', 1],
		]);
		expect(berlin.map((day) => [day.date, day.messages])).toEqual([
			['2026-11-11', 1],
			['2026-11-12', 1],
		]);
	});

	it('pages and sorts the users, with deleted users as one row', async () => {
		const at = new Date('2026-11-10T10:00:00.000Z');
		for (const threadId of ['t-1', 't-2', 't-3']) {
			await insertEvent({ type: 'message', userId: alice.id, threadId, createdAt: at });
		}
		await insertEvent({ type: 'message', userId: bob.id, threadId: 't-4', createdAt: at });
		await insertEvent({ type: 'message', userId: null, threadId: 't-5', createdAt: at });
		await insertEvent({ type: 'message', userId: null, threadId: 't-6', createdAt: at });
		await insertEvent({
			type: 'workflow-created',
			userId: bob.id,
			threadId: 't-4',
			resourceId: 'wf-1',
			createdAt: at,
		});

		const firstPage = await repository.countByUser(
			range,
			{ skip: 0, take: 2, sortBy: 'messages:desc' },
			{},
		);
		const byWorkflows = await repository.countByUser(
			range,
			{ skip: 0, take: 1, sortBy: 'workflowsCreated:desc' },
			{},
		);

		expect(firstPage.count).toBe(3);
		expect(firstPage.data).toEqual([
			expect.objectContaining({
				userId: alice.id,
				firstName: 'Alice',
				lastName: 'Archer',
				messages: 3,
				conversations: 3,
				lastUsedAt: at.toISOString(),
			}),
			expect.objectContaining({ userId: null, firstName: null, messages: 2, conversations: 2 }),
		]);
		expect(byWorkflows.data).toEqual([
			expect.objectContaining({ userId: bob.id, workflowsCreated: 1, messages: 1 }),
		]);
	});

	it('deletes the events created before a date', async () => {
		await insertEvent({
			type: 'message',
			userId: alice.id,
			threadId: 't-1',
			createdAt: new Date('2025-01-01T00:00:00.000Z'),
		});
		await insertEvent({
			type: 'message',
			userId: alice.id,
			threadId: 't-2',
			createdAt: new Date('2026-11-10T00:00:00.000Z'),
		});

		await expect(
			repository.deleteCreatedBefore(new Date('2026-01-01T00:00:00.000Z'), {}),
		).resolves.toBe(1);
		await expect(repository.summarize(range, {})).resolves.toMatchObject({ messages: 1 });
	});
});
