import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';

import { McpClientUsageService } from '../mcp-client-usage.service';

const NOW = new Date('2026-11-13T10:00:00.000Z');

describe('McpClientUsageService', () => {
	const userConsentRepository = mock<UserConsentRepository>();
	const logger = mock<Logger>();
	let service: McpClientUsageService;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ now: NOW });
		userConsentRepository.recordLastUsed.mockResolvedValue();
		service = new McpClientUsageService(userConsentRepository, logger);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('records the use with a one-minute throttle that the database enforces', () => {
		service.recordUse('user-1', 'client-1', 'token-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledWith(
			'user-1',
			'client-1',
			NOW,
			60_000,
		);
	});

	it('skips the database for the same token inside the interval', () => {
		service.recordUse('user-1', 'client-1', 'token-1');
		vi.advanceTimersByTime(59_999);
		service.recordUse('user-1', 'client-1', 'token-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		service.recordUse('user-1', 'client-1', 'token-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(2);
	});

	it('sends the first use of a new token, such as after the grant was created again', () => {
		service.recordUse('user-1', 'client-1', 'token-1');
		service.recordUse('user-1', 'client-1', 'token-2');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(2);
	});

	it('leaves the throttle to the database when the token has no id', () => {
		service.recordUse('user-1', 'client-1');
		service.recordUse('user-1', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(2);
	});

	it('evicts only the oldest token when the fast path is full', () => {
		for (let i = 0; i < 1001; i++) service.recordUse('user-1', 'client-1', `token-${i}`);
		userConsentRepository.recordLastUsed.mockClear();

		service.recordUse('user-1', 'client-1', 'token-0');
		service.recordUse('user-1', 'client-1', 'token-1000');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(1);
	});

	it('logs a failed write, does not throw, and retries on the next request', async () => {
		const error = new Error('db down');
		userConsentRepository.recordLastUsed.mockRejectedValueOnce(error);

		expect(() => service.recordUse('user-1', 'client-1', 'token-1')).not.toThrow();
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

		expect(logger.warn).toHaveBeenCalledWith('Failed to update lastUsedAt on MCP client grant', {
			userId: 'user-1',
			clientId: 'client-1',
			error,
		});

		service.recordUse('user-1', 'client-1', 'token-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(2);
	});
});
