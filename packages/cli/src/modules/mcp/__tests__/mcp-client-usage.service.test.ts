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
		service.recordUse('user-1', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledWith(
			'user-1',
			'client-1',
			NOW,
			60_000,
		);
	});

	it('leaves the throttle to the database, so every request reaches it', () => {
		service.recordUse('user-1', 'client-1');
		service.recordUse('user-1', 'client-1');

		expect(userConsentRepository.recordLastUsed).toHaveBeenCalledTimes(2);
	});

	it('logs a failed write and does not throw', async () => {
		const error = new Error('db down');
		userConsentRepository.recordLastUsed.mockRejectedValueOnce(error);

		expect(() => service.recordUse('user-1', 'client-1')).not.toThrow();
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

		expect(logger.warn).toHaveBeenCalledWith('Failed to update lastUsedAt on MCP client grant', {
			userId: 'user-1',
			clientId: 'client-1',
			error,
		});
	});
});
