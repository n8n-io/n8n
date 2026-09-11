import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import type { CacheService } from '@/services/cache/cache.service';
import type { JwtService } from '@/services/jwt.service';

import { AppTokenService, type AppSessionRecord } from '../app-token.service';

const record: AppSessionRecord = { appId: 'app-1', viewerId: 'user-1', sessionToken: 'cookie' };
const publicRecord: AppSessionRecord = { appId: 'app-1', viewerId: null, sessionToken: null };

describe('AppTokenService', () => {
	const store = new Map<string, unknown>();
	const cacheService = mock<CacheService>();
	const jwtService = mock<JwtService>();
	const authService = mock<AuthService>();
	const service = new AppTokenService(jwtService, cacheService, authService);

	beforeEach(() => {
		store.clear();
		cacheService.set.mockImplementation(async (key, value) => {
			store.set(key, value);
		});
		cacheService.take.mockImplementation(async <T>(key: string) => {
			const value = store.get(key) as T | undefined;
			store.delete(key);
			return value;
		});
		jwtService.sign.mockReset();
		jwtService.verify.mockReset();
		authService.validateCookieToken.mockReset();
		jwtService.sign.mockImplementation((payload) => JSON.stringify(payload));
		jwtService.verify.mockImplementation((token) => JSON.parse(token));
	});

	describe('issueCode / exchangeCode', () => {
		test('stores the record under the code for 60 seconds', async () => {
			const code = await service.issueCode(record);

			expect(code).toMatch(/^[0-9a-f]{64}$/);
			expect(cacheService.set).toHaveBeenCalledWith(`apps:code:${code}`, record, 60_000);
		});

		test('exchanges a code once for an access token carrying the record and a refresh token', async () => {
			const code = await service.issueCode(record);

			const pair = await service.exchangeCode(code);

			expect(pair).toEqual({
				accessToken: expect.any(String),
				refreshToken: expect.stringMatching(/^[0-9a-f]{64}$/),
				expiresIn: 600,
			});
			expect(jwtService.sign).toHaveBeenCalledWith(
				{ kind: 'app-access', appId: 'app-1', viewerId: 'user-1', mode: 'published' },
				{ expiresIn: 600 },
			);
			expect(service.verifyAccess(pair!.accessToken)).toEqual({
				appId: 'app-1',
				viewerId: 'user-1',
				mode: 'published',
			});
			await expect(service.exchangeCode(code)).resolves.toBeNull();
		});

		test('carries a draft mode from the code record into the access token', async () => {
			const code = await service.issueCode({ ...record, mode: 'draft' });

			const pair = await service.exchangeCode(code);

			expect(service.verifyAccess(pair!.accessToken)).toMatchObject({ mode: 'draft' });
		});

		test('treats an access token without a mode as published', () => {
			const token = JSON.stringify({ kind: 'app-access', appId: 'app-1', viewerId: null });

			expect(service.verifyAccess(token)).toEqual({
				appId: 'app-1',
				viewerId: null,
				mode: 'published',
			});
		});

		test('rejects an unknown code', async () => {
			await expect(service.exchangeCode('nope')).resolves.toBeNull();
		});
	});

	describe('refresh', () => {
		test('rotates the refresh token and re-validates the n8n session', async () => {
			const first = await service.exchangeCode(await service.issueCode(record));

			const second = await service.refresh(first!.refreshToken);

			expect(second).not.toBeNull();
			expect(second!.refreshToken).not.toBe(first!.refreshToken);
			expect(authService.validateCookieToken).toHaveBeenCalledWith('cookie');
			expect(store.has(`apps:refresh:${second!.refreshToken}`)).toBe(true);
			expect(cacheService.set).toHaveBeenLastCalledWith(
				`apps:refresh:${second!.refreshToken}`,
				record,
				7 * 24 * 60 * 60 * 1000,
			);
			await expect(service.refresh(first!.refreshToken)).resolves.toBeNull();
		});

		test('keeps the draft mode across a refresh', async () => {
			const first = await service.exchangeCode(
				await service.issueCode({ ...record, mode: 'draft' }),
			);

			const second = await service.refresh(first!.refreshToken);

			expect(service.verifyAccess(second!.accessToken)).toMatchObject({ mode: 'draft' });
		});

		test('fails when the n8n session is no longer valid', async () => {
			authService.validateCookieToken.mockRejectedValue(new Error('Unauthorized'));
			const pair = await service.exchangeCode(await service.issueCode(record));

			await expect(service.refresh(pair!.refreshToken)).resolves.toBeNull();
		});

		test('refreshes a public session without an auth check', async () => {
			const pair = await service.exchangeCode(await service.issueCode(publicRecord));

			await expect(service.refresh(pair!.refreshToken)).resolves.not.toBeNull();
			expect(authService.validateCookieToken).not.toHaveBeenCalled();
		});

		test('rejects an unknown refresh token', async () => {
			await expect(service.refresh('nope')).resolves.toBeNull();
		});
	});

	describe('verifyAccess', () => {
		test('rejects a token the jwt service refuses', () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('expired');
			});

			expect(service.verifyAccess('token')).toBeNull();
		});

		test('rejects a valid jwt that is not an app access token', () => {
			jwtService.verify.mockReturnValue({ sub: 'user-1' });

			expect(service.verifyAccess('token')).toBeNull();
		});
	});
});
