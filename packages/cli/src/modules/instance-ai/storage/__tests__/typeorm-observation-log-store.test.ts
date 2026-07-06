import { mock } from 'vitest-mock-extended';

import type { InstanceAiMessage } from '../../entities/instance-ai-message.entity';
import type { InstanceAiObservation } from '../../entities/instance-ai-observation.entity';
import type { InstanceAiMessageRepository } from '../../repositories/instance-ai-message.repository';
import type { InstanceAiObservationCursorRepository } from '../../repositories/instance-ai-observation-cursor.repository';
import type { InstanceAiObservationLockRepository } from '../../repositories/instance-ai-observation-lock.repository';
import type { InstanceAiObservationRepository } from '../../repositories/instance-ai-observation.repository';
import { TypeORMObservationLogStore } from '../typeorm-observation-log-store';

function makeMessageRow(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'message-1',
		threadId: 'thread-1',
		resourceId: 'user-1',
		content: '{"not":"an-agent-message"}',
		role: 'unknown',
		type: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as InstanceAiMessage;
}

function createObservationLogStore(deps: {
	observationRepo?: InstanceAiObservationRepository;
	observationCursorRepo?: InstanceAiObservationCursorRepository;
	observationLockRepo?: InstanceAiObservationLockRepository;
	messageRepo?: InstanceAiMessageRepository;
}) {
	return new TypeORMObservationLogStore(
		deps.observationRepo ?? mock<InstanceAiObservationRepository>(),
		deps.observationCursorRepo ?? mock<InstanceAiObservationCursorRepository>(),
		deps.observationLockRepo ?? mock<InstanceAiObservationLockRepository>(),
		deps.messageRepo ?? mock<InstanceAiMessageRepository>(),
		(entity) => {
			const parsed = JSON.parse(entity.content) as { role?: string; content?: unknown[] };
			if (typeof parsed.role !== 'string' || !Array.isArray(parsed.content)) return undefined;
			return { ...parsed, id: entity.id, createdAt: entity.createdAt } as never;
		},
	);
}

describe('TypeORMObservationLogStore', () => {
	it('appends and reads active observation log entries', async () => {
		const observationRepo = mock<InstanceAiObservationRepository>();
		const createdAt = new Date('2026-01-01T00:00:00.000Z');
		observationRepo.create.mockImplementation((row) => row as InstanceAiObservation);
		observationRepo.save.mockResolvedValue([
			{
				id: 'obs-1',
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'User prefers Slack alerts',
				parentId: null,
				tokenCount: 8,
				status: 'active',
				supersededBy: null,
				createdAt,
			},
		] as never);
		observationRepo.find.mockResolvedValueOnce([
			{
				id: 'obs-1',
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'User prefers Slack alerts',
				parentId: null,
				tokenCount: 8,
				status: 'active',
				supersededBy: null,
				createdAt,
			},
		] as InstanceAiObservation[]);

		const store = createObservationLogStore({ observationRepo });

		const inserted = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'User prefers Slack alerts',
				createdAt,
			},
		]);
		const active = await store.getActiveObservationLog({ observationScopeId: 'thread-1' });

		expect(inserted).toEqual([
			expect.objectContaining({
				id: 'obs-1',
				marker: 'important',
				text: 'User prefers Slack alerts',
			}),
		]);
		expect(active).toEqual(inserted);
	});

	it('stores and reads observation cursors', async () => {
		const observationCursorRepo = mock<InstanceAiObservationCursorRepository>();
		const lastObservedAt = new Date('2026-01-01T00:00:00.000Z');
		const updatedAt = new Date('2026-01-01T00:01:00.000Z');
		observationCursorRepo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'message-2',
			lastObservedAt,
			updatedAt,
		} as never);

		const store = createObservationLogStore({ observationCursorRepo });

		await expect(store.getCursor('thread-1')).resolves.toBeNull();
		await store.setCursor({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'message-2',
			lastObservedAt,
			updatedAt,
		});

		await expect(store.getCursor('thread-1')).resolves.toEqual({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'message-2',
			lastObservedAt,
			updatedAt,
		});
		expect(observationCursorRepo.upsert).toHaveBeenCalledWith(
			{
				observationScopeId: 'thread-1',
				lastObservedMessageId: 'message-2',
				lastObservedAt,
				updatedAt,
			},
			{
				conflictPaths: ['observationScopeId'],
				skipUpdateIfNoValuesChanged: false,
			},
		);
	});

	it('returns observation-scope messages after the cursor keyset', async () => {
		const messageRepo = mock<InstanceAiMessageRepository>();
		const sinceCreatedAt = new Date('2026-01-01T00:00:00.000Z');
		messageRepo.find.mockResolvedValueOnce([
			makeMessageRow({
				id: 'message-2',
				content: JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'hello' }] }),
				role: 'user',
				type: 'llm',
				createdAt: new Date('2026-01-01T00:01:00.000Z'),
			}),
		]);

		const store = createObservationLogStore({ messageRepo });

		const messages = await store.getMessagesForObservationScope('thread-1', {
			since: { sinceCreatedAt, sinceMessageId: 'message-1' },
		});

		expect(messages).toEqual([
			expect.objectContaining({
				id: 'message-2',
				role: 'user',
			}),
		]);
	});
});
