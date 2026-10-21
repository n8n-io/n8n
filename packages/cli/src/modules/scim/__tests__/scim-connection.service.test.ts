import type { ScimAuthFailure, ScimAuthFailureReason } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ScimTokenRepository } from '../database/scim-token.repository';
import {
	deriveScimConnectionStatus,
	SCIM_ACTIVITY_WRITE_INTERVAL_MS,
	ScimConnectionService,
} from '../scim-connection.service';
import type { ScimSettingsService } from '../scim-settings.service';

const at = (minute: number) => new Date(Date.UTC(2026, 9, 19, 12, minute)).toISOString();

describe('deriveScimConnectionStatus', () => {
	const failure = (
		minute: number,
		reason: ScimAuthFailureReason = 'superseded_token',
	): ScimAuthFailure => ({ at: at(minute), reason });

	const newToken = { createdAt: at(0), lastUsedAt: null };
	const usedToken = { createdAt: at(0), lastUsedAt: at(1) };

	it.each([
		['no token', null, null, 'waiting'],
		['no token and a stored failure', null, failure(5), 'waiting'],
		['a new token', newToken, null, 'waiting'],
		['a used token', usedToken, null, 'connected'],
		['an old token after the last use', usedToken, failure(2), 'error'],
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

	// Any client can send these, so after the first use they must not cause `error`.
	it.each(['missing_header', 'invalid_token'] as const)(
		'returns connected for %s after the last use',
		(reason) => {
			expect(deriveScimConnectionStatus(usedToken, failure(2, reason))).toBe('connected');
		},
	);

	// Before the first use, a wrong setup of the identity provider must show.
	it.each(['missing_header', 'invalid_token', 'superseded_token'] as const)(
		'returns error for %s on a new token',
		(reason) => {
			expect(deriveScimConnectionStatus(newToken, failure(2, reason))).toBe('error');
		},
	);
});

describe('ScimConnectionService', () => {
	let scimTokenRepository: Mocked<ScimTokenRepository>;
	let scimSettingsService: Mocked<ScimSettingsService>;
	let logger: Mocked<Logger>;
	let cacheService: Mocked<CacheService>;
	let service: ScimConnectionService;
	/** The failure in the settings table, which all mains share. */
	let stored: ScimAuthFailure | null;
	/** The cache, which all mains share, as with Redis. */
	let cache: Map<string, unknown>;

	const FAILURE_WRITE_CACHE_KEY = 'scim.connection.lastFailureWriteAt';

	const token = (tokenHash = 'token-a') => ({ tokenHash });

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(at(0)));
		scimTokenRepository = mock<ScimTokenRepository>();
		scimSettingsService = mock<ScimSettingsService>();
		stored = null;
		scimSettingsService.getLastAuthFailure.mockImplementation(async () => stored);
		// The settings service applies the rules of the stored failure. Its tests cover them.
		scimSettingsService.setLastAuthFailure.mockImplementation(async (failure) => {
			stored = failure;
			return true;
		});
		scimSettingsService.clearLastAuthFailure.mockImplementation(async () => {
			stored = null;
		});
		logger = mock<Logger>();
		cache = new Map();
		cacheService = mock<CacheService>();
		cacheService.get.mockImplementation(async (key) => cache.get(key));
		cacheService.set.mockImplementation(async (key, value) => {
			cache.set(key, value);
		});
		cacheService.delete.mockImplementation(async (key) => {
			cache.delete(key);
		});
		service = newMain();
	});

	/** Each main has its own throttle state, and shares the database and the cache. */
	const newMain = () =>
		new ScimConnectionService(logger, scimTokenRepository, scimSettingsService, cacheService);

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
			await service.recordAuthFailure('superseded_token');
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
			// Any client can send these requests, so they do not read the stored failure.
			expect(scimSettingsService.getLastAuthFailure).not.toHaveBeenCalled();
		});

		it('writes the old-token failure at most once for 500 failures in one minute', async () => {
			for (let i = 0; i < 500; i++) {
				await service.recordAuthFailure('superseded_token');
				advance(100);
			}

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(1);
		});

		it('writes again after the interval', async () => {
			await service.recordAuthFailure('invalid_token');
			advance(SCIM_ACTIVITY_WRITE_INTERVAL_MS);
			await service.recordAuthFailure('missing_header');

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
			expect(scimSettingsService.setLastAuthFailure).toHaveBeenLastCalledWith({
				at: at(1),
				reason: 'missing_header',
			});
		});

		// Requests without a valid token must not delay the write of an old token.
		it('writes an old-token failure at once after a failure without a valid token', async () => {
			await service.recordAuthFailure('missing_header');
			advance(1000);
			await service.recordAuthFailure('superseded_token');

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
			expect(scimSettingsService.setLastAuthFailure).toHaveBeenLastCalledWith(
				expect.objectContaining({ reason: 'superseded_token' }),
			);
		});

		it('logs a write failure and does not throw', async () => {
			scimSettingsService.setLastAuthFailure.mockRejectedValue(new Error('db down'));

			await expect(service.recordAuthFailure('invalid_token')).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	// The first requests of a burst arrive before any read or write finishes.
	describe('recordAuthFailure for a burst of parallel failures', () => {
		let reads: Array<() => void>;
		let writes: Array<() => void>;

		beforeEach(() => {
			reads = [];
			writes = [];
			// Hold each read and write of the stored failure until the test lets it finish.
			scimSettingsService.getLastAuthFailure.mockImplementation(
				async () => await new Promise((resolve) => reads.push(() => resolve(stored))),
			);
			scimSettingsService.setLastAuthFailure.mockImplementation(
				async (failure) =>
					await new Promise((resolve) =>
						writes.push(() => {
							stored = failure;
							resolve(true);
						}),
					),
			);
		});

		const flush = async () => await new Promise((resolve) => setImmediate(resolve));

		/** Lets the held operations finish, `first` before the others, until none is held. */
		const finishHeld = async (first: 'reads' | 'writes') => {
			await flush();
			while (reads.length + writes.length > 0) {
				for (const queue of first === 'reads' ? [reads, writes] : [writes, reads]) {
					for (const finish of queue.splice(0)) finish();
					await flush();
				}
			}
		};

		const burst = (reasons: (i: number) => ScimAuthFailureReason, msApart = 10) => {
			const requests: Array<Promise<void>> = [];
			for (let i = 0; i < 20; i++) {
				requests.push(service.recordAuthFailure(reasons(i)));
				advance(msApart);
			}
			return requests;
		};

		it.each([
			['reads', 10],
			['writes', 10],
			['reads', 0],
			['writes', 0],
		] as const)(
			'stores one old-token failure when the %s finish first, %i ms apart',
			async (first, msApart) => {
				const requests = burst(() => 'superseded_token', msApart);

				await finishHeld(first);
				await Promise.all(requests);

				expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(1);
				expect(stored).toEqual({ at: at(0), reason: 'superseded_token' });
			},
		);

		it('stores one failure without a valid token', async () => {
			const requests = burst((i) => (i % 2 ? 'invalid_token' : 'missing_header'));

			await finishHeld('reads');
			await Promise.all(requests);

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(1);
			expect(stored).toEqual({ at: at(0), reason: 'missing_header' });
			expect(scimSettingsService.getLastAuthFailure).not.toHaveBeenCalled();
		});
	});

	// Any client can cause `missing_header` and `invalid_token`. The write in
	// the settings service keeps a stored `superseded_token` failure.
	describe('recordAuthFailure with a stored old-token failure', () => {
		it.each(['missing_header', 'invalid_token'] as const)(
			'leaves the choice for %s to the write and does not read',
			async (reason) => {
				await service.recordAuthFailure('superseded_token');
				advance(SCIM_ACTIVITY_WRITE_INTERVAL_MS);

				await service.recordAuthFailure(reason);

				expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
				expect(scimSettingsService.setLastAuthFailure).toHaveBeenLastCalledWith({
					at: at(1),
					reason,
				});
				expect(scimSettingsService.getLastAuthFailure).not.toHaveBeenCalled();
			},
		);

		it('does not read for failures in the same minute', async () => {
			await service.recordAuthFailure('superseded_token');
			for (let i = 0; i < 10; i++) {
				advance(1000);
				await service.recordAuthFailure('missing_header');
			}

			expect(scimSettingsService.getLastAuthFailure).not.toHaveBeenCalled();
			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
		});

		it('writes a failure without a valid token after a reset', async () => {
			await service.recordAuthFailure('superseded_token');
			await service.resetAuthFailure();
			advance(1000);

			await service.recordAuthFailure('invalid_token');

			expect(stored).toEqual({
				at: new Date(Date.parse(at(0)) + 1000).toISOString(),
				reason: 'invalid_token',
			});
		});

		it('replaces it with a newer old-token failure', async () => {
			await service.recordAuthFailure('superseded_token');
			advance(SCIM_ACTIVITY_WRITE_INTERVAL_MS);

			await service.recordAuthFailure('superseded_token');

			expect(stored).toEqual({ at: at(1), reason: 'superseded_token' });
		});
	});

	// A rotation on another main clears the stored failure, but not the
	// throttle of this main.
	describe('recordAuthFailure after a reset on another main', () => {
		const storedFailure = (failure: ScimAuthFailure | null) =>
			scimSettingsService.getLastAuthFailure.mockResolvedValue(failure);

		beforeEach(async () => {
			await service.recordAuthFailure('superseded_token');
			advance(1000);
		});

		it('writes an old-token failure at once when the stored failure is gone', async () => {
			storedFailure(null);

			await service.recordAuthFailure('superseded_token');

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
			expect(scimSettingsService.setLastAuthFailure).toHaveBeenLastCalledWith({
				at: new Date(Date.parse(at(0)) + 1000).toISOString(),
				reason: 'superseded_token',
			});
		});

		// After the reset, a failure without a valid token was stored.
		it('writes an old-token failure at once when another failure replaced it', async () => {
			storedFailure({ at: at(0), reason: 'invalid_token' });

			await service.recordAuthFailure('superseded_token');

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
		});

		it('keeps the throttle while the old-token failure is stored', async () => {
			storedFailure({ at: at(0), reason: 'superseded_token' });

			await service.recordAuthFailure('superseded_token');

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(1);
		});

		it('writes once for parallel old-token failures', async () => {
			storedFailure(null);

			await Promise.all(
				Array.from({ length: 20 }, async () => await service.recordAuthFailure('superseded_token')),
			);

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
		});

		it('keeps the throttle and logs when the read fails', async () => {
			scimSettingsService.getLastAuthFailure.mockRejectedValue(new Error('db down'));

			await expect(service.recordAuthFailure('superseded_token')).resolves.toBeUndefined();

			expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'SCIM: Failed to read the stored authentication failure',
				expect.anything(),
			);
		});
	});

	// The cache tells a main about the failure writes of the other mains.
	describe('recordAuthSuccess after a failure write on another main', () => {
		let otherMain: ScimConnectionService;

		beforeEach(() => {
			otherMain = newMain();
		});

		it('writes the use at once, so that the status is connected again', async () => {
			await service.recordAuthSuccess(token());
			advance(1000);
			await otherMain.recordAuthFailure('superseded_token');
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

		it('writes once for parallel requests', async () => {
			await service.recordAuthSuccess(token());
			advance(1000);
			await otherMain.recordAuthFailure('superseded_token');
			advance(1000);

			await Promise.all(
				Array.from({ length: 20 }, async () => await service.recordAuthSuccess(token())),
			);

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(2);
		});

		it('keeps the throttle when the failure is older than the last use', async () => {
			await otherMain.recordAuthFailure('superseded_token');
			advance(1000);
			await service.recordAuthSuccess(token());
			advance(1000);

			await service.recordAuthSuccess(token());

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(1);
		});

		it('keeps the throttle after a reset', async () => {
			await service.recordAuthSuccess(token());
			advance(1000);
			await otherMain.recordAuthFailure('superseded_token');
			await otherMain.resetAuthFailure();
			advance(1000);

			await service.recordAuthSuccess(token());

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(1);
		});

		it('keeps the throttle, does not throw and logs when the cache read fails', async () => {
			await service.recordAuthSuccess(token());
			cacheService.get.mockRejectedValue(new Error('redis down'));

			await expect(service.recordAuthSuccess(token())).resolves.toBeUndefined();

			expect(scimTokenRepository.markUsed).toHaveBeenCalledTimes(1);
			expect(logger.debug).toHaveBeenCalled();
		});
	});

	describe('recordAuthFailure and the cache', () => {
		it('shares the time of the failure for one interval, after the failure is saved', async () => {
			scimSettingsService.setLastAuthFailure.mockImplementation(async () => {
				expect(cacheService.set).not.toHaveBeenCalled();
				return true;
			});

			await service.recordAuthFailure('superseded_token');

			expect(cacheService.set).toHaveBeenCalledExactlyOnceWith(
				FAILURE_WRITE_CACHE_KEY,
				Date.parse(at(0)),
				SCIM_ACTIVITY_WRITE_INTERVAL_MS,
			);
		});

		it('does not share a failure that the write skips', async () => {
			scimSettingsService.setLastAuthFailure.mockResolvedValue(false);

			await service.recordAuthFailure('missing_header');

			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('does not share a failure when the write fails', async () => {
			scimSettingsService.setLastAuthFailure.mockRejectedValue(new Error('db down'));

			await service.recordAuthFailure('superseded_token');

			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('logs and does not throw when the cache write fails', async () => {
			cacheService.set.mockRejectedValue(new Error('redis down'));

			await expect(service.recordAuthFailure('superseded_token')).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'SCIM: Failed to share the time of the failure write',
				expect.anything(),
			);
		});
	});

	describe('resetAuthFailure', () => {
		it('clears the stored failure and the shared time of the failure write', async () => {
			await service.recordAuthFailure('superseded_token');

			await service.resetAuthFailure();

			expect(scimSettingsService.clearLastAuthFailure).toHaveBeenCalledTimes(1);
			expect(cache.has(FAILURE_WRITE_CACHE_KEY)).toBe(false);
		});

		it.each(['missing_header', 'superseded_token'] as const)(
			'lets the next %s failure write at once',
			async (reason) => {
				await service.recordAuthFailure(reason);
				await service.resetAuthFailure();
				await service.recordAuthFailure(reason);

				expect(scimSettingsService.setLastAuthFailure).toHaveBeenCalledTimes(2);
			},
		);
	});
});
