import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { N8nMemory, type N8nMemoryImpl } from '../n8n-memory';

describe('N8nMemoryImpl', () => {
	let repository: AgentThreadRepository;
	let memory: N8nMemoryImpl;

	beforeAll(async () => {
		// The concurrent tests need real parallel transactions on Postgres.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentThreadRepository);
		memory = Container.get(N8nMemory).getImplementation('agent-1');
	});

	beforeEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function readMetadata(): Promise<unknown> {
		const row = await repository.findOneByOrFail({ id: 'thread-1' });
		return jsonParse(row.metadata ?? 'null');
	}

	describe('saveThread', () => {
		it('keeps every write when saves and patches run at the same time', async () => {
			await memory.saveThread({ id: 'thread-1', resourceId: 'user-1', metadata: { count: 0 } });

			const patch = async () =>
				await memory.patchThread({
					threadId: 'thread-1',
					update: ({ metadata }) => ({
						metadata: { ...metadata, count: (metadata?.count as number) + 1 },
					}),
				});
			const touch = async () => await memory.saveThread({ id: 'thread-1', resourceId: 'user-1' });
			const save = async (i: number) =>
				await memory.saveThread({
					id: 'thread-1',
					resourceId: 'user-1',
					metadata: { [`key${i}`]: true },
				});

			await Promise.all(
				Array.from({ length: 10 }, async (_, i) => await Promise.all([patch(), touch(), save(i)])),
			);

			expect(await readMetadata()).toEqual({
				count: 10,
				...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`key${i}`, true])),
			});
		});

		it('writes nothing when the save carries no title or metadata', async () => {
			const created = await memory.saveThread({
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Chat',
				metadata: { keep: 1 },
			});

			const saved = await memory.saveThread({ id: 'thread-1', resourceId: 'user-2' });

			expect(saved).toMatchObject({ resourceId: 'user-1', title: 'Chat', metadata: { keep: 1 } });
			const row = await repository.findOneByOrFail({ id: 'thread-1' });
			expect(row.updatedAt.getTime()).toBe(created.updatedAt.getTime());
		});
	});
});
