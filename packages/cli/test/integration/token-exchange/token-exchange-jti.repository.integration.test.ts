import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { TokenExchangeJtiRepository } from '@/modules/token-exchange/database/repositories/token-exchange-jti.repository';

describe('TokenExchangeJtiRepository', () => {
	let repository: TokenExchangeJtiRepository;

	beforeAll(async () => {
		await testModules.loadModules(['token-exchange']);
		await testDb.init();
		repository = Container.get(TokenExchangeJtiRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['TokenExchangeJti']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('atomicConsume', () => {
		const futureDate = new Date(Date.now() + 60 * 60 * 1000);

		it('should return true on first consume of a JTI', async () => {
			const result = await repository.atomicConsume('jti-1', futureDate);

			expect(result).toBe(true);
		});

		it('should return false when the same JTI is consumed again', async () => {
			await repository.atomicConsume('jti-1', futureDate);

			const result = await repository.atomicConsume('jti-1', futureDate);

			expect(result).toBe(false);
		});

		it('should persist the row in the database', async () => {
			await repository.atomicConsume('jti-persisted', futureDate);

			const row = await repository.findOneBy({ jti: 'jti-persisted' });

			expect(row).not.toBeNull();
			expect(row!.jti).toBe('jti-persisted');
		});

		it('should allow consuming different JTIs independently', async () => {
			const result1 = await repository.atomicConsume('jti-a', futureDate);
			const result2 = await repository.atomicConsume('jti-b', futureDate);

			expect(result1).toBe(true);
			expect(result2).toBe(true);
		});

		it('should allow only one consumer when called concurrently with the same JTI', async () => {
			const results = await Promise.all([
				repository.atomicConsume('jti-race', futureDate),
				repository.atomicConsume('jti-race', futureDate),
			]);

			const consumed = results.filter(Boolean);
			expect(consumed).toHaveLength(1);
		});
	});

	describe('deleteExpiredBatch', () => {
		it('should return 0 when table is empty', async () => {
			const deleted = await repository.deleteExpiredBatch(100);

			expect(deleted).toBe(0);
		});

		it('should delete expired rows and return count', async () => {
			const pastDate = new Date(Date.now() - 60 * 1000);
			await repository.atomicConsume('expired-1', pastDate);
			await repository.atomicConsume('expired-2', pastDate);

			const deleted = await repository.deleteExpiredBatch(100);

			expect(deleted).toBe(2);
			expect(await repository.count()).toBe(0);
		});

		it('should not delete rows that have not expired', async () => {
			const futureDate = new Date(Date.now() + 60 * 60 * 1000);
			const pastDate = new Date(Date.now() - 60 * 1000);
			await repository.atomicConsume('still-valid', futureDate);
			await repository.atomicConsume('already-expired', pastDate);

			const deleted = await repository.deleteExpiredBatch(100);

			expect(deleted).toBe(1);
			expect(await repository.findOneBy({ jti: 'still-valid' })).not.toBeNull();
			expect(await repository.findOneBy({ jti: 'already-expired' })).toBeNull();
		});

		it('should respect batch size limit', async () => {
			const pastDate = new Date(Date.now() - 60 * 1000);
			await repository.atomicConsume('exp-1', pastDate);
			await repository.atomicConsume('exp-2', pastDate);
			await repository.atomicConsume('exp-3', pastDate);

			const deleted = await repository.deleteExpiredBatch(2);

			expect(deleted).toBe(2);
			expect(await repository.count()).toBe(1);
		});
	});
});
