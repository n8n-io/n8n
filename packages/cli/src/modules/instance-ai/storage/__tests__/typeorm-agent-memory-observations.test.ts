import { Equal, MoreThan } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { InstanceAiMessage } from '../../entities/instance-ai-message.entity';
import type { InstanceAiObservationEntity } from '../../entities/instance-ai-observation.entity';
import type { InstanceAiMessageRepository } from '../../repositories/instance-ai-message.repository';
import type { InstanceAiObservationCursorRepository } from '../../repositories/instance-ai-observation-cursor.repository';
import type { InstanceAiObservationLockRepository } from '../../repositories/instance-ai-observation-lock.repository';
import type { InstanceAiObservationRepository } from '../../repositories/instance-ai-observation.repository';
import { TypeORMAgentMemory } from '../typeorm-agent-memory';

function makeMessageRow(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'message-1',
		threadId: 'thread-1',
		resourceId: 'user-1',
		content: JSON.stringify({
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		}),
		role: 'user',
		type: null,
		createdAt: new Date('2026-01-01T00:00:01.000Z'),
		updatedAt: new Date('2026-01-01T00:00:01.000Z'),
		...overrides,
	} as InstanceAiMessage;
}

function makeMemory(
	overrides: {
		messageRepo?: InstanceAiMessageRepository;
		observationRepo?: InstanceAiObservationRepository;
		observationCursorRepo?: InstanceAiObservationCursorRepository;
	} = {},
) {
	return new TypeORMAgentMemory(
		mock(),
		overrides.messageRepo ?? mock<InstanceAiMessageRepository>(),
		mock(),
		overrides.observationRepo ?? mock<InstanceAiObservationRepository>(),
		overrides.observationCursorRepo ?? mock<InstanceAiObservationCursorRepository>(),
		mock<InstanceAiObservationLockRepository>(),
		mock(),
	);
}

describe('TypeORMAgentMemory observational memory', () => {
	it('appends observation log entries with estimated token counts', async () => {
		const observationRepo = mock<InstanceAiObservationRepository>();
		const createdAt = new Date('2026-01-02T00:00:00.000Z');
		observationRepo.create.mockImplementation((row) => row as InstanceAiObservationEntity);
		observationRepo.save.mockImplementation(async (rows) => {
			const list = Array.isArray(rows) ? rows : [rows];
			return list.map((row, index) => ({
				...row,
				id: `obs-${index}`,
				createdAt,
				updatedAt: createdAt,
			})) as never;
		});
		const memory = makeMemory({ observationRepo });

		const entries = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'important',
				text: 'Built workflow wf-123',
				createdAt,
			},
		]);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			marker: 'important',
			text: 'Built workflow wf-123',
			status: 'active',
		});
		expect(observationRepo.save).toHaveBeenCalled();
	});

	it('reads and writes observation cursors', async () => {
		const observationCursorRepo = mock<InstanceAiObservationCursorRepository>();
		observationCursorRepo.findOneBy.mockResolvedValue(null);
		const memory = makeMemory({ observationCursorRepo });

		const lastObservedAt = new Date('2026-01-02T00:00:00.000Z');
		await memory.setCursor({
			scopeKind: 'thread',
			scopeId: 'thread-1',
			lastObservedMessageId: 'message-1',
			lastObservedAt,
			updatedAt: lastObservedAt,
		});

		expect(observationCursorRepo.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				scopeKind: 'thread',
				scopeId: 'thread-1',
				lastObservedMessageId: 'message-1',
			}),
			expect.any(Object),
		);
	});

	it('queries thread-scoped messages with a cursor keyset', async () => {
		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.find.mockResolvedValue([makeMessageRow()]);
		const memory = makeMemory({ messageRepo });
		const sinceCreatedAt = new Date('2026-01-01T00:00:00.000Z');

		const result = await memory.getMessagesForScope('thread', 'thread-1', {
			resourceId: 'user-1',
			since: { sinceCreatedAt, sinceMessageId: 'message-0' },
		});

		expect(messageRepo.find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: [
					{ threadId: 'thread-1', resourceId: 'user-1', createdAt: MoreThan(sinceCreatedAt) },
					{
						threadId: 'thread-1',
						resourceId: 'user-1',
						createdAt: Equal(sinceCreatedAt),
						id: MoreThan('message-0'),
					},
				],
			}),
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe('message-1');
	});

	it('rejects non-thread scopes', async () => {
		const memory = makeMemory();

		await expect(memory.getMessagesForScope('resource', 'user-1')).rejects.toThrow(/not supported/);
	});
});
