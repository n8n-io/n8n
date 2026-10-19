import type { ScimAuthFailure } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ScimToken } from '../database/scim-token.entity';
import type { ScimTokenRepository } from '../database/scim-token.repository';
import {
	deriveScimConnectionStatus,
	SCIM_ACTIVITY_WRITE_INTERVAL_MS,
	ScimConnectionService,
} from '../scim-connection.service';
import type { ScimSettingsService } from '../scim-settings.service';

const at = (minute: number) => new Date(Date.UTC(2026, 9, 19, 12, minute)).toISOString();

describe('deriveScimConnectionStatus', () => {
	const failure = (minute: number): ScimAuthFailure => ({
		at: at(minute),
		reason: 'invalid_token',
	});

	it.each([
		['no token', null, null, 'waiting'],
		['no token and a stored failure', null, failure(5), 'waiting'],
		['a new token', { createdAt: at(0), lastUsedAt: null }, null, 'waiting'],
		['a used token', { createdAt: at(0), lastUsedAt: at(1) }, null, 'connected'],
		['a failure after the last use', { createdAt: at(0), lastUsedAt: at(1) }, failure(2), 'error'],
		['a failure on a new token', { createdAt: at(0), lastUsedAt: null }, failure(2), 'error'],
		['a use after the failure', { createdAt: at(0), lastUsedAt: at(3) }, failure(2), 'connected'],
		[
			'a failure from before the token',
			{ createdAt: at(3), lastUsedAt: null },
			failure(2),
			'waiting',
		],
		[
			'a failure at the same time as the last use',
			{ createdAt: at(0), lastUsedAt: at(2) },
			failure(2),
			'connected',
		],
	] as const)('returns %s → %s', (_, token, lastAuthFailure, expected) => {
		expect(deriveScimConnectionStatus(token, lastAuthFailure)).toBe(expected);
	});
});

describe('ScimConnectionService', () => {
	let scimTokenRepository: Mocked<ScimTokenRepository>;
	let scimSettingsService: Mocked<ScimSettingsService>;
	let logger: Mocked<Logger>;
	let service: ScimConnectionService;

	const token = (tokenHash = 'token-a') => mock<ScimToken>({ tokenHash });

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(at(0)));
		scimTokenRepository = mock<ScimTokenRepository>();
		scimSettingsService = mock<ScimSettingsService>();
		logger = mock<Logger>();
		service = new ScimConnectionService(logger, scimTokenRepository, scimSettingsService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const advance = (ms: number) => vi.setSystemTime(Date.now() + ms);

	describe('recordAuthSuccess', () => {
		it('writes the last use at most once for 500 requests in one minute', async () => {
			for (let i = 0; i < 500; i++) {
				await service.recordAuthSuccess(token());
				advance(100);
			}

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(1);
			expect(scimTokenRepository.markUsed).toHaveBeenCalledWith('token-a', new Date(at(0)), {});
		});

		it('writes once for concurrent requests', async () => {
			await Promise.all(
				Array.from({ length: 50 }, async () => await service.recordAuthSuccess(token())),
			);

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(1);
		});

		it('writes again after the interval', async () => {
			await service.recordAuthSuccess(token());
			advance(SCIM_ACTIVITY_WRITE_INTERVAL_MS);
			await service.recordAuthSuccess(token());

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(2);
		});

		it('writes at once for a new token', async () => {
			await service.recordAuthSuccess(token('token-a'));
			await service.recordAuthSuccess(token('token-b'));

			expect(scimTokenRepository.markUsed).toHaveBeenLastCalledWith(
				'token-b',
				expect.any(Date),
				{},
			);
			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(2);
		});

		it('writes at once after a failure write, so that the status is connected again', async () => {
			await service.recordAuthSuccess(token());
			advance(1000);
			await service.recordAuthFailure('invalid_token');
			advance(1000);
			await service.recordAuthSuccess(token());
			await service.recordAuthSuccess(token());

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(2);
			expect(scimTokenRepository.markUsed).toHaveBeenLastCalledWith(
				'token-a',
				new Date(Date.parse(at(0)) + 2000),
				{},
			);
		});

		it('logs a write failure and does not throw', async () => {
			scimTokenRepository.markUsed.mockRejectedValue(new Error('db down'));

			await expect(service.recordAuthSuccess(token())).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('recordAuthFailure', () => {
		it('writes the failure at most once for 500 failures in one minute', async () => {
			for (let i = 0; i < 500; i++) {
				await service.recordAuthFailure(i % 2 ? 'invalid_token' : 'missing_header');
				advance(100);
			}

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(1);
			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledWith({
				at: at(0),
				reason: 'missing_header',
			});
		});

		it('writes again after the interval', async () => {
			await service.recordAuthFailure('invalid_token');
			advance(SCIM_ACTIVITY_WRITE_INTERVAL_MS);
			await service.recordAuthFailure('superseded_token');

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
			expect(scimSettingsService.setLastAuthFailure).toHaveBeenLastCalledWith({
				at: at(1),
				reason: 'superseded_token',
			});
		});

		it('logs a write failure and does not throw', async () => {
			scimSettingsService.setLastAuthFailure.mockRejectedValue(new Error('db down'));

			await expect(service.recordAuthFailure('invalid_token')).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('resetAuthFailure', () => {
		it('clears the stored failure', async () => {
			await service.resetAuthFailure();

			expect(scimSettingsService.clearLastAuthFailure).toHaveBeenCalledTimes(1);
		});

		it('lets the next failure write at once', async () => {
			await service.recordAuthFailure('invalid_token');
			await service.resetAuthFailure();
			await service.recordAuthFailure('superseded_token');

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
			expect(scimSettingsService.setLastAuthFailure).toHaveBeenLastCalledWith(
				expect.objectContaining({ reason: 'superseded_token' }),
			);
		});
	});
});
