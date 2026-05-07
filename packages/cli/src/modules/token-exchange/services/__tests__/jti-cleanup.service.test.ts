import type { Logger } from '@n8n/backend-common';
import type { TokenExchangeConfig } from '../../token-exchange.config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { TokenExchangeJtiRepository } from '../../database/repositories/token-exchange-jti.repository';
import { JtiCleanupService } from '../jti-cleanup.service';

const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
const config = mock<TokenExchangeConfig>({
	jtiCleanupIntervalSeconds: 30,
	jtiCleanupBatchSize: 500,
});
const jtiRepository = mock<TokenExchangeJtiRepository>();
const instanceSettings = mock<InstanceSettings>({ isLeader: true });

let service: JtiCleanupService;

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	service = new JtiCleanupService(logger, config, jtiRepository, instanceSettings);
});

afterEach(() => {
	service.shutdown();
	jest.useRealTimers();
});

describe('JtiCleanupService', () => {
	describe('init', () => {
		it('should start cleanup when instance is leader', () => {
			jtiRepository.deleteExpiredBatch.mockResolvedValue(0);
			Object.assign(instanceSettings, { isLeader: true });

			service.init();
			jest.advanceTimersByTime(30_000);

			expect(jtiRepository.deleteExpiredBatch).toHaveBeenCalled();
		});

		it('should not start cleanup when instance is not leader', () => {
			Object.assign(instanceSettings, { isLeader: false });

			service.init();
			jest.advanceTimersByTime(60_000);

			expect(jtiRepository.deleteExpiredBatch).not.toHaveBeenCalled();
		});
	});

	describe('startCleanup', () => {
		it('should schedule cleanup at configured interval', () => {
			jtiRepository.deleteExpiredBatch.mockResolvedValue(0);

			service.startCleanup();

			expect(jtiRepository.deleteExpiredBatch).not.toHaveBeenCalled();

			jest.advanceTimersByTime(30_000);

			expect(jtiRepository.deleteExpiredBatch).toHaveBeenCalledWith(500);
		});

		it('should not start if shutting down', () => {
			service.shutdown();
			service.startCleanup();

			jest.advanceTimersByTime(60_000);

			expect(jtiRepository.deleteExpiredBatch).not.toHaveBeenCalled();
		});
	});

	describe('cleanup', () => {
		it('should log total count when expired JTIs are deleted', async () => {
			jtiRepository.deleteExpiredBatch.mockResolvedValue(42);

			service.startCleanup();
			jest.advanceTimersByTime(30_000);

			// Wait for the async cleanup to complete
			await jest.advanceTimersByTimeAsync(0);

			expect(logger.scoped).toHaveBeenCalledWith('token-exchange');
		});

		it('should loop until fewer than batchSize rows are deleted', async () => {
			jtiRepository.deleteExpiredBatch
				.mockResolvedValueOnce(500) // first batch: full
				.mockResolvedValueOnce(500) // second batch: full
				.mockResolvedValueOnce(123); // third batch: partial → stop

			service.startCleanup();
			jest.advanceTimersByTime(30_000);
			await jest.advanceTimersByTimeAsync(0);

			expect(jtiRepository.deleteExpiredBatch).toHaveBeenCalledTimes(3);
		});

		it('should stop after one call when deleted count is below batchSize', async () => {
			jtiRepository.deleteExpiredBatch.mockResolvedValue(10);

			service.startCleanup();
			jest.advanceTimersByTime(30_000);
			await jest.advanceTimersByTimeAsync(0);

			expect(jtiRepository.deleteExpiredBatch).toHaveBeenCalledTimes(1);
		});

		it('should catch and log errors without throwing', async () => {
			jtiRepository.deleteExpiredBatch.mockRejectedValue(new Error('DB error'));

			service.startCleanup();
			jest.advanceTimersByTime(30_000);

			// Wait for the async cleanup to complete — should not throw
			await jest.advanceTimersByTimeAsync(0);

			expect(jtiRepository.deleteExpiredBatch).toHaveBeenCalled();
		});
	});

	describe('stopCleanup', () => {
		it('should stop the cleanup interval on leader stepdown', () => {
			jtiRepository.deleteExpiredBatch.mockResolvedValue(0);

			service.startCleanup();
			service.stopCleanup();

			jest.advanceTimersByTime(60_000);

			expect(jtiRepository.deleteExpiredBatch).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('should stop the cleanup interval', () => {
			jtiRepository.deleteExpiredBatch.mockResolvedValue(0);

			service.startCleanup();
			service.shutdown();

			jest.advanceTimersByTime(60_000);

			expect(jtiRepository.deleteExpiredBatch).not.toHaveBeenCalled();
		});
	});
});
