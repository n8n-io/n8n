import type { TransactionRunner } from '@n8n/db';
import { Equal, In, LessThan, MoreThan } from '@n8n/typeorm';
import { mockEntityManager } from '@test/mocking';
import { mock } from 'vitest-mock-extended';

import { InstanceAiMessage } from '../../entities/instance-ai-message.entity';
import { InstanceAiMessageRepository } from '../instance-ai-message.repository';

describe('InstanceAiMessageRepository', () => {
	const entityManager = mockEntityManager(InstanceAiMessage);
	let repository: InstanceAiMessageRepository;

	const cutoff = new Date('2026-01-01T00:00:01.000Z');
	const messageRow = (id: string, createdAt = cutoff) => ({
		id,
		threadId: 'thread-1',
		content: `content-${id}`,
		role: 'user',
		type: null,
		resourceId: 'user-1',
		createdAt,
		updatedAt: createdAt,
	});

	beforeEach(() => {
		vi.resetAllMocks();
		repository = new InstanceAiMessageRepository(
			entityManager.connection,
			mock<TransactionRunner>(),
		);
	});

	it('queries thread memory in ascending order by default and switches to descending with a limit or cutoff', async () => {
		const ascRows = [mock<InstanceAiMessage>({ id: 'a' })];
		const limitedRows = [mock<InstanceAiMessage>({ id: 'b' })];
		entityManager.find.mockResolvedValueOnce(ascRows).mockResolvedValueOnce(limitedRows);

		await expect(repository.findForThreadMemory('thread-1', undefined, {})).resolves.toBe(ascRows);
		expect(entityManager.find).toHaveBeenNthCalledWith(1, InstanceAiMessage, {
			where: { threadId: 'thread-1' },
			order: { createdAt: 'ASC', id: 'ASC' },
		});

		await expect(
			repository.findForThreadMemory('thread-1', { before: cutoff, limit: 2 }, {}),
		).resolves.toBe(limitedRows);
		expect(entityManager.find).toHaveBeenNthCalledWith(2, InstanceAiMessage, {
			where: { threadId: 'thread-1', createdAt: LessThan(cutoff) },
			order: { createdAt: 'DESC', id: 'DESC' },
			take: 2,
		});
	});

	it('queries descending message pages with a lookahead row, page offsets, and a keyset cursor', async () => {
		const firstPage = [mock<InstanceAiMessage>({ id: 'd' })];
		const laterPage = [mock<InstanceAiMessage>({ id: 'b' })];
		const cursorPage = [mock<InstanceAiMessage>({ id: 'a' })];
		entityManager.find
			.mockResolvedValueOnce(firstPage)
			.mockResolvedValueOnce(laterPage)
			.mockResolvedValueOnce(cursorPage);

		await expect(
			repository.findThreadMessagePage({ threadId: 'thread-1', limit: 2 }, {}),
		).resolves.toBe(firstPage);
		expect(entityManager.find).toHaveBeenNthCalledWith(1, InstanceAiMessage, {
			where: { threadId: 'thread-1' },
			order: { createdAt: 'DESC', id: 'DESC' },
			take: 3,
			skip: 0,
		});

		await expect(
			repository.findThreadMessagePage({ threadId: 'thread-1', limit: 2, page: 2 }, {}),
		).resolves.toBe(laterPage);
		expect(entityManager.find).toHaveBeenNthCalledWith(2, InstanceAiMessage, {
			where: { threadId: 'thread-1' },
			order: { createdAt: 'DESC', id: 'DESC' },
			take: 3,
			skip: 4,
		});

		await expect(
			repository.findThreadMessagePage(
				{ threadId: 'thread-1', limit: 2, page: 10, before: { createdAt: cutoff, id: 'c' } },
				{},
			),
		).resolves.toBe(cursorPage);
		expect(entityManager.find).toHaveBeenNthCalledWith(3, InstanceAiMessage, {
			where: [
				{ threadId: 'thread-1', createdAt: LessThan(cutoff) },
				{ threadId: 'thread-1', createdAt: cutoff, id: LessThan('c') },
			],
			order: { createdAt: 'DESC', id: 'DESC' },
			take: 3,
			skip: 0,
		});
	});

	it('queries observation-scope messages in ascending order with and without a keyset cursor', async () => {
		const allRows = [mock<InstanceAiMessage>({ id: 'a' })];
		const afterCursorRows = [mock<InstanceAiMessage>({ id: 'c' })];
		entityManager.find.mockResolvedValueOnce(allRows).mockResolvedValueOnce(afterCursorRows);

		await expect(repository.findForObservationScope('scope-1', undefined, {})).resolves.toBe(
			allRows,
		);
		expect(entityManager.find).toHaveBeenNthCalledWith(1, InstanceAiMessage, {
			where: [{ threadId: 'scope-1' }],
			order: { createdAt: 'ASC', id: 'ASC' },
		});

		await expect(
			repository.findForObservationScope(
				'scope-1',
				{ sinceCreatedAt: cutoff, sinceMessageId: 'b' },
				{},
			),
		).resolves.toBe(afterCursorRows);
		expect(entityManager.find).toHaveBeenNthCalledWith(2, InstanceAiMessage, {
			where: [
				{ threadId: 'scope-1', createdAt: MoreThan(cutoff) },
				{ threadId: 'scope-1', createdAt: Equal(cutoff), id: MoreThan('b') },
			],
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	});

	it('creates entity instances for each row and saves the batch', async () => {
		const rows = [messageRow('e'), messageRow('f')];
		const createdEntities = [
			mock<InstanceAiMessage>({ id: 'e' }),
			mock<InstanceAiMessage>({ id: 'f' }),
		];
		entityManager.create
			.mockReturnValueOnce(createdEntities[0])
			.mockReturnValueOnce(createdEntities[1]);

		await repository.saveMessageBatch(rows, {});

		expect(entityManager.create).toHaveBeenNthCalledWith(1, InstanceAiMessage, rows[0]);
		expect(entityManager.create).toHaveBeenNthCalledWith(2, InstanceAiMessage, rows[1]);
		expect(entityManager.save).toHaveBeenCalledWith(InstanceAiMessage, createdEntities);
	});

	it('deletes only messages matching the requested ids', async () => {
		await repository.deleteByIds(['b', 'd'], {});

		expect(entityManager.delete).toHaveBeenCalledWith(InstanceAiMessage, {
			id: In(['b', 'd']),
		});
	});
});
