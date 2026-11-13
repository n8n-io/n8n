import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { InstanceAiMessage } from '../../entities/instance-ai-message.entity';
import { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import { InstanceAiMessageRepository } from '../instance-ai-message.repository';

describe('InstanceAiMessageRepository', () => {
	let repository: InstanceAiMessageRepository;
	let rows: Repository<InstanceAiMessage>;
	const threadId = '11111111-1111-4111-8111-111111111111';
	const otherThreadId = '22222222-2222-4222-8222-222222222222';
	const older = new Date('2026-01-01T00:00:00.000Z');
	const tied = new Date('2026-01-01T00:00:01.000Z');
	const newer = new Date('2026-01-01T00:00:02.000Z');
	const messageRow = (id: string, createdAt = tied) => ({
		id,
		threadId,
		content: `content-${id}`,
		role: 'user',
		type: null,
		resourceId: 'user-1',
		createdAt,
		updatedAt: createdAt,
	});
	const ids = (messages: InstanceAiMessage[]) => messages.map((message) => message.id);

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		const project = await createTeamProject();
		await Container.get(DataSource)
			.getRepository(InstanceAiThread)
			.insert(
				[threadId, otherThreadId].map((id) => ({
					id,
					resourceId: 'user-1',
					projectId: project.id,
					title: '',
				})),
			);
		repository = Container.get(InstanceAiMessageRepository);
		rows = Container.get(DataSource).getRepository(InstanceAiMessage);
	});

	beforeEach(async () => {
		await rows.clear();
		await rows.insert([
			messageRow('d', newer),
			messageRow('c'),
			messageRow('a', older),
			messageRow('b'),
			{ ...messageRow('other'), threadId: otherThreadId },
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('reads thread memory in timestamp and id order, with an optional limit and exclusive cutoff', async () => {
		expect(ids(await repository.findForThreadMemory(threadId, undefined, {}))).toEqual([
			'a',
			'b',
			'c',
			'd',
		]);
		expect(ids(await repository.findForThreadMemory(threadId, { limit: 2 }, {}))).toEqual([
			'd',
			'c',
		]);
		expect(ids(await repository.findForThreadMemory(threadId, { before: tied }, {}))).toEqual([
			'a',
		]);
		expect(
			ids(await repository.findForThreadMemory(threadId, { before: newer, limit: 2 }, {})),
		).toEqual(['c', 'b']);
		expect(ids(await repository.findForThreadMemory(threadId, { limit: 0 }, {}))).toEqual([
			'a',
			'b',
			'c',
			'd',
		]);
	});

	it('reads descending pages with a lookahead row and uses the cursor instead of the offset', async () => {
		expect(ids(await repository.findThreadMessagePage({ threadId, limit: 2 }, {}))).toEqual([
			'd',
			'c',
			'b',
		]);
		expect(
			ids(await repository.findThreadMessagePage({ threadId, limit: 2, page: 1 }, {})),
		).toEqual(['b', 'a']);
		expect(
			ids(
				await repository.findThreadMessagePage(
					{ threadId, limit: 2, page: 10, before: { createdAt: tied, id: 'c' } },
					{},
				),
			),
		).toEqual(['b', 'a']);
		expect(
			await repository.findThreadMessagePage(
				{ threadId, limit: 2, before: { createdAt: older, id: 'a' } },
				{},
			),
		).toEqual([]);
	});

	it('reads only observation-scope messages after the timestamp and id cursor', async () => {
		expect(ids(await repository.findForObservationScope(threadId, undefined, {}))).toEqual([
			'a',
			'b',
			'c',
			'd',
		]);
		expect(
			ids(
				await repository.findForObservationScope(
					threadId,
					{ sinceCreatedAt: tied, sinceMessageId: 'b' },
					{},
				),
			),
		).toEqual(['c', 'd']);
	});

	it('saves one batch and updates an existing id without adding a row', async () => {
		const batch = [messageRow('e', newer), messageRow('f', newer)];
		await expect(repository.saveMessageBatch(batch, {})).resolves.toBeUndefined();
		expect(await rows.findBy({ threadId })).toEqual(expect.arrayContaining(batch));
		await repository.saveMessageBatch([{ ...batch[0], content: 'changed' }], {});
		expect(await rows.countBy({ threadId })).toBe(6);
		expect(await rows.findOneByOrFail({ id: 'e' })).toMatchObject({
			content: 'changed',
			createdAt: newer,
		});
	});

	it('deletes only the requested ids and accepts missing rows', async () => {
		await expect(repository.deleteByIds(['b', 'd', 'missing'], {})).resolves.toBeUndefined();
		expect(ids(await rows.find({ order: { id: 'ASC' } }))).toEqual(['a', 'c', 'other']);
		await expect(repository.deleteByIds(['missing'], {})).resolves.toBeUndefined();
	});

	it('returns empty reads for a thread with no messages', async () => {
		await rows.delete({ threadId });
		expect(await repository.findForThreadMemory(threadId, undefined, {})).toEqual([]);
		expect(await repository.findThreadMessagePage({ threadId, limit: 2 }, {})).toEqual([]);
		expect(await repository.findForObservationScope(threadId, undefined, {})).toEqual([]);
	});

	it('uses the supplied transaction for every query and rolls back all writes', async () => {
		const original = await rows.find({ order: { id: 'ASC' } });
		const failure = new Error('Roll back message changes');

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await repository.saveMessageBatch(
					[{ ...messageRow('a', older), content: 'changed' }, messageRow('e', newer)],
					ctx,
				);
				expect(await repository.findForThreadMemory(threadId, undefined, ctx)).toEqual(
					expect.arrayContaining([expect.objectContaining({ id: 'a', content: 'changed' })]),
				);
				expect(ids(await repository.findThreadMessagePage({ threadId, limit: 1 }, ctx))).toEqual([
					'e',
					'd',
				]);
				expect(
					ids(
						await repository.findForObservationScope(
							threadId,
							{ sinceCreatedAt: newer, sinceMessageId: 'd' },
							ctx,
						),
					),
				).toEqual(['e']);
				await repository.deleteByIds(['e'], ctx);
				expect(ids(await repository.findThreadMessagePage({ threadId, limit: 1 }, ctx))).toEqual([
					'd',
					'c',
				]);
				throw failure;
			}),
		).rejects.toBe(failure);

		expect(await rows.find({ order: { id: 'ASC' } })).toEqual(original);
	});
});
