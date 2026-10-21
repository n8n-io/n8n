import type { Logger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import { WhatsAppWebhookVerificationStore } from '../../whatsapp/whatsapp-webhook-verification.store';

const AGENT_ID = 'agent-1';
const KEY = `agents:whatsapp:webhook-verified:${AGENT_ID}`;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('WhatsAppWebhookVerificationStore', () => {
	let cacheService: ReturnType<typeof mock<CacheService>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let store: WhatsAppWebhookVerificationStore;

	beforeEach(() => {
		cacheService = mock<CacheService>();
		logger = mock<Logger>();
		store = new WhatsAppWebhookVerificationStore(cacheService, logger);
	});

	describe('markVerified', () => {
		it('records the handshake for seven days', async () => {
			await store.markVerified(AGENT_ID);

			expect(cacheService.set).toHaveBeenCalledWith(KEY, true, SEVEN_DAYS_MS);
		});

		it('logs a warning and does not throw when the cache fails', async () => {
			cacheService.set.mockRejectedValue(new Error('cache down'));

			await expect(store.markVerified(AGENT_ID)).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				agentId: AGENT_ID,
				error: 'cache down',
			});
		});
	});

	describe('clear', () => {
		it('deletes the handshake record', async () => {
			await store.clear(AGENT_ID);

			expect(cacheService.delete).toHaveBeenCalledWith(KEY);
		});

		it('logs a warning and does not throw when the cache fails', async () => {
			cacheService.delete.mockRejectedValue('cache down');

			await expect(store.clear(AGENT_ID)).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				agentId: AGENT_ID,
				error: 'cache down',
			});
		});
	});

	describe('reset', () => {
		it('deletes the handshake record', async () => {
			await store.reset(AGENT_ID);

			expect(cacheService.delete).toHaveBeenCalledWith(KEY);
		});

		it('throws when the cache fails', async () => {
			cacheService.delete.mockRejectedValue(new Error('cache down'));

			await expect(store.reset(AGENT_ID)).rejects.toThrow('cache down');
		});
	});

	describe('isVerified', () => {
		it('returns true when the cache holds true', async () => {
			cacheService.get.mockResolvedValue(true);

			expect(await store.isVerified(AGENT_ID)).toBe(true);
			expect(cacheService.get).toHaveBeenCalledWith(KEY);
		});

		it.each([
			['nothing', undefined],
			['a value that is not true', 'true'],
		])('returns false when the cache holds %s', async (_label, value) => {
			cacheService.get.mockResolvedValue(value);

			expect(await store.isVerified(AGENT_ID)).toBe(false);
		});
	});
});
