import type { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { LessThan, MoreThanOrEqual } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { TokenExchangeJtiRepository } from '@/modules/token-exchange/database/repositories/token-exchange-jti.repository';
import { JtiCleanupTask } from '@/modules/token-exchange/services/jti-cleanup.task';
import { TokenExchangeConfig } from '@/modules/token-exchange/token-exchange.config';

const hour = 60 * 60 * 1000;

describe('JtiCleanupTask', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const signal = new AbortController().signal;
	let repository: TokenExchangeJtiRepository;
	let task: JtiCleanupTask;

	beforeAll(async () => {
		await testModules.loadModules(['token-exchange']);
		await testDb.init();
		repository = Container.get(TokenExchangeJtiRepository);
		const config = Container.get(TokenExchangeConfig);
		config.jtiCleanupBatchSize = 100;
		task = new JtiCleanupTask(logger, config, repository);
	});

	beforeEach(() => {
		logger.debug.mockClear();
	});

	afterEach(async () => {
		await testDb.truncate(['TokenExchangeJti']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertRows(prefix: string, count: number, expiresAt: Date): Promise<void> {
		await repository.insert(
			Array.from({ length: count }, (_, i) => ({
				jti: `${prefix}-${i}`,
				expiresAt,
				createdAt: expiresAt,
			})),
		);
	}

	async function counts(): Promise<{ expired: number; valid: number }> {
		const now = new Date();
		return {
			expired: await repository.count({ where: { expiresAt: LessThan(now) } }),
			valid: await repository.count({ where: { expiresAt: MoreThanOrEqual(now) } }),
		};
	}

	function deletedTotal(): number {
		return logger.debug.mock.calls
			.filter(([message]) => message === 'Cleaned up expired JTIs')
			.reduce((sum, [, meta]) => sum + (meta as { count: number }).count, 0);
	}

	it('should delete each expired row once when runs overlap', async () => {
		await insertRows('expired', 3000, new Date(Date.now() - hour));
		await insertRows('valid', 200, new Date(Date.now() + hour));

		await Promise.all(Array.from({ length: 4 }, async () => await task.run(signal)));

		expect(await counts()).toEqual({ expired: 0, valid: 200 });
		expect(deletedTotal()).toBe(3000);
	});

	it('should keep fresh tokens and reject replays while runs overlap', async () => {
		await insertRows('expired', 3000, new Date(Date.now() - hour));
		const future = new Date(Date.now() + hour);

		const runs = Promise.all(Array.from({ length: 4 }, async () => await task.run(signal)));
		const fresh = Array.from(
			{ length: 100 },
			async (_, i) => await repository.atomicConsume(`fresh-${i}`, future),
		);
		const replays = Array.from(
			{ length: 100 },
			async (_, i) =>
				await Promise.all([
					repository.atomicConsume(`replay-${i}`, future),
					repository.atomicConsume(`replay-${i}`, future),
				]),
		);
		await runs;

		expect((await Promise.all(fresh)).every(Boolean)).toBe(true);
		for (const pair of await Promise.all(replays)) {
			expect(pair.filter(Boolean)).toHaveLength(1);
		}
		expect(await counts()).toEqual({ expired: 0, valid: 200 });
	});
});
