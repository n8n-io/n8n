import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { AgentThreadRepository } from '../repositories/agent-thread.repository';

describe('AgentThreadRepository', () => {
	let repository: AgentThreadRepository;

	beforeAll(async () => {
		// The concurrent patch test needs real parallel transactions on Postgres.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentThreadRepository);
	});

	beforeEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function seedThread(metadata: Record<string, unknown>) {
		return await repository.save(
			repository.create({
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Chat',
				metadata: JSON.stringify(metadata),
			}),
		);
	}

	async function readMetadata(): Promise<unknown> {
		const row = await repository.findOneByOrFail({ id: 'thread-1' });
		return jsonParse(row.metadata ?? 'null');
	}

	describe('patchThread', () => {
		it('replaces the metadata, so a patch can remove keys', async () => {
			await seedThread({ keep: 1, drop: 2 });

			const saved = await repository.patchThread(
				'thread-1',
				() => ({ title: 'Renamed', metadata: JSON.stringify({ keep: 1 }) }),
				{},
			);

			expect(saved?.title).toBe('Renamed');
			expect(await readMetadata()).toEqual({ keep: 1 });
		});

		it('writes nothing when the update returns null', async () => {
			const seeded = await seedThread({ count: 1 });

			const result = await repository.patchThread('thread-1', () => null, {});

			expect(result).toMatchObject({ id: 'thread-1', title: 'Chat' });
			const row = await repository.findOneByOrFail({ id: 'thread-1' });
			expect(row.updatedAt.getTime()).toBe(seeded.updatedAt.getTime());
			expect(await readMetadata()).toEqual({ count: 1 });
		});

		it('returns null for a missing thread without calling the update', async () => {
			const update = vi.fn();

			await expect(repository.patchThread('missing', update, {})).resolves.toBeNull();
			expect(update).not.toHaveBeenCalled();
		});

		it('keeps every update when patches run at the same time', async () => {
			await seedThread({ count: 0 });

			// Two mains can patch one thread at the same time. On Postgres the row
			// lock makes each patch wait for the previous commit. SQLite
			// serializes the two transactions through the write connection.
			const increment = async () =>
				await repository.patchThread(
					'thread-1',
					(row) => {
						const metadata = jsonParse<{ count: number }>(row.metadata ?? '{}');
						return { metadata: JSON.stringify({ count: metadata.count + 1 }) };
					},
					{},
				);

			await Promise.all(Array.from({ length: 10 }, increment));

			expect(await readMetadata()).toEqual({ count: 10 });
		});
	});
});
