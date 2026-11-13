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

	it('records the last use time of the grant', () => {
		service.recordUse('user-1', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledWith('user-1', 'client-1', NOW);
	});

	it('writes at most once a minute for the same grant', () => {
		service.recordUse('user-1', 'client-1');
		vi.advanceTimersByTime(59_000);
		service.recordUse('user-1', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1_000);
		service.recordUse('user-1', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(2);
		expect(userConsentRepository.recordLastUsed).toHaveBeenLastCalledWith(
			'user-1',
			'client-1',
			new Date(NOW.getTime() + 60_000),
		);
	});

	it('throttles each grant separately', () => {
		service.recordUse('user-1', 'client-1');
		service.recordUse('user-1', 'client-2');
		service.recordUse('user-2', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(3);
	});

	it('logs a failed write and retries on the next request', async () => {
		const error = new Error('db down');
		userConsentRepository.recordLastUsed.mockRejectedValueOnce(error);

		service.recordUse('user-1', 'client-1');
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

		expect(logger.warn).toHaveBeenCalledWith('Failed to update lastUsedAt on MCP client grant', {
			userId: 'user-1',
			clientId: 'client-1',
			error,
		});

		service.recordUse('user-1', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(2);
	});
});
