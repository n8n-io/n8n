import { mock } from 'jest-mock-extended';

import type { TokenExchangeJtiRepository } from '../../database/repositories/token-exchange-jti.repository';
import { JtiStoreService } from '../jti-store.service';

const jtiRepository = mock<TokenExchangeJtiRepository>();
const service = new JtiStoreService(jtiRepository);

beforeEach(() => jest.clearAllMocks());

describe('JtiStoreService', () => {
	const jti = 'test-jti-123';
	const expiresAt = new Date('2026-04-01T12:00:00Z');

	describe('consume', () => {
		it('should add 60-second grace period to expiresAt', async () => {
			jtiRepository.atomicConsume.mockResolvedValue(true);

			await service.consume(jti, expiresAt);

			const expectedExpiry = new Date(expiresAt.getTime() + 60_000);
			expect(jtiRepository.atomicConsume).toHaveBeenCalledWith(jti, expectedExpiry);
		});

		it('should return true when JTI is consumed for the first time', async () => {
			jtiRepository.atomicConsume.mockResolvedValue(true);

			const result = await service.consume(jti, expiresAt);

			expect(result).toBe(true);
		});

		it('should return false when JTI was already consumed (replay)', async () => {
			jtiRepository.atomicConsume.mockResolvedValue(false);

			const result = await service.consume(jti, expiresAt);

			expect(result).toBe(false);
		});
	});
});
