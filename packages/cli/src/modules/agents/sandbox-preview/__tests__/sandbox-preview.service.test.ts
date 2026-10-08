import type { SandboxPortRoute, WorkspaceSandbox } from '@n8n/agents/sandbox';
import type { GlobalConfig } from '@n8n/config';
import { BadRequestError } from '@n8n/errors';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { JwtService } from '@/services/jwt.service';
import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import type { SandboxPortCapability } from '../sandbox-port-capability.service';
import {
	SANDBOX_PREVIEW_TTL_SECONDS,
	SandboxPreviewService,
	type SandboxPreviewRequest,
} from '../sandbox-preview.service';

// The service needs only `resolveN8nSandboxConfig`, not the import graph of the real settings service.
vi.mock('@/services/sandbox-settings.service', () => ({ SandboxSettingsService: class {} }));

const TTL_MS = SANDBOX_PREVIEW_TTL_SECONDS * 1000;
/** A whole second, so the token's `exp` and the entry's expiry fall on the same instant. */
const START = new Date('2026-10-08T10:00:00.000Z');

const ROUTE: SandboxPortRoute = {
	serviceUrl: 'http://sandbox-service.internal',
	path: '/sandboxes/sb-1/ports/5173',
};
const REQUEST: SandboxPreviewRequest = { userId: 'user-1', projectId: 'project-1', port: 5173 };

function setup(options: { basePath?: string } = {}) {
	const jwtService = new JwtService(
		mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
		mock<GlobalConfig>({ userManagement: { jwtSecret: '' } }),
		mock(),
	);
	const apiKey = `test-key-${crypto.randomUUID()}`;
	const settings = mock<SandboxSettingsService>();
	settings.resolveN8nSandboxConfig.mockResolvedValue({ serviceUrl: ROUTE.serviceUrl, apiKey });
	const capability = mock<SandboxPortCapability>();
	capability.assertSupported.mockResolvedValue(undefined);
	const globalConfig = mock<GlobalConfig>({ path: options.basePath ?? '/' });
	const service = new SandboxPreviewService(jwtService, settings, capability, globalConfig);
	const getPortRoute = vi.fn(
		async (port: number): Promise<SandboxPortRoute> =>
			await Promise.resolve({ ...ROUTE, path: `/sandboxes/sb-1/ports/${port}` }),
	);
	const sandbox = mock<WorkspaceSandbox>({ getPortRoute });
	return { service, jwtService, settings, capability, sandbox, getPortRoute, apiKey };
}

const entryCount = (service: SandboxPreviewService) =>
	(service as unknown as { entries: Map<string, unknown> }).entries.size;

const tokenOf = (url: string) => {
	const match = /\/sandbox-preview\/([^/]+)\/$/.exec(url);
	if (!match) throw new Error(`Not a preview URL: ${url}`);
	return match[1];
};

describe('SandboxPreviewService', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(START);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('open', () => {
		it('returns an n8n path whose token reaches the sandbox port', async () => {
			const { service, sandbox, getPortRoute, settings } = setup();

			const { url } = await service.open(sandbox, REQUEST);

			expect(url).toMatch(/^\/sandbox-preview\/[\w-]+\.[\w-]+\.[\w-]+\/$/);
			expect(getPortRoute).toHaveBeenCalledWith(5173);
			const entry = service.resolveToken(tokenOf(url));
			expect(entry).toEqual(
				expect.objectContaining({
					userId: 'user-1',
					projectId: 'project-1',
					serviceUrl: ROUTE.serviceUrl,
					path: ROUTE.path,
					expiresAt: START.getTime() + TTL_MS,
				}),
			);
			// The proxy reads the current key for each request; the entry keeps none.
			expect(entry).not.toHaveProperty('apiKey');
			expect(settings.resolveN8nSandboxConfig).not.toHaveBeenCalled();
		});

		it('signs a token with its own audience, a TTL of one hour and no project or key in it', async () => {
			const { service, sandbox, apiKey } = setup();

			const { url } = await service.open(sandbox, REQUEST);
			const claims = jwt.decode(tokenOf(url));

			expect(claims).toEqual({
				sub: 'user-1',
				jti: expect.any(String),
				aud: 'n8n:sandbox-preview',
				iat: START.getTime() / 1000,
				exp: START.getTime() / 1000 + 3600,
			});
			expect(tokenOf(url)).not.toContain(apiKey);
		});

		it.each(['/n8n/', '/n8n', '/n8n//'])('keeps the N8N_PATH prefix %s', async (basePath) => {
			const { service, sandbox } = setup({ basePath });

			const { url } = await service.open(sandbox, REQUEST);

			expect(url).toMatch(/^\/n8n\/sandbox-preview\/[^/]+\/$/);
		});

		it('checks the ports capability of the service that the route names', async () => {
			const { service, sandbox, capability } = setup();

			await service.open(sandbox, REQUEST);

			expect(capability.assertSupported).toHaveBeenCalledWith(ROUTE.serviceUrl);
		});

		it('refuses a sandbox that has no port route', async () => {
			const { service, capability } = setup();
			const sandbox = mock<WorkspaceSandbox>({ getPortRoute: undefined });

			const error = await service.open(sandbox, REQUEST).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect(error).toHaveProperty('message', 'This sandbox cannot show app previews');
			expect(capability.assertSupported).not.toHaveBeenCalled();
		});

		it('makes no URL when the service lacks the ports capability', async () => {
			const { service, sandbox, capability } = setup();
			capability.assertSupported.mockRejectedValue(
				new BadRequestError('This sandbox service cannot show app previews yet.'),
			);

			await expect(service.open(sandbox, REQUEST)).rejects.toThrow(
				'This sandbox service cannot show app previews yet.',
			);
			expect(entryCount(service)).toBe(0);
		});

		it('gives out the same URL again for the same user, project and port', async () => {
			const { service, sandbox } = setup();

			const first = await service.open(sandbox, REQUEST);
			vi.setSystemTime(START.getTime() + TTL_MS / 2);
			const second = await service.open(sandbox, REQUEST);

			expect(second.url).toBe(first.url);
			expect(entryCount(service)).toBe(1);
		});

		it('makes a new URL once less than half of the TTL is left, and keeps the old one valid', async () => {
			const { service, sandbox } = setup();

			const first = await service.open(sandbox, REQUEST);
			vi.setSystemTime(START.getTime() + TTL_MS / 2 + 1);
			const second = await service.open(sandbox, REQUEST);

			expect(second.url).not.toBe(first.url);
			expect(service.resolveToken(tokenOf(first.url))).toBeDefined();
			expect(service.resolveToken(tokenOf(second.url))).toBeDefined();
		});

		it.each([
			['user', { ...REQUEST, userId: 'user-2' }],
			['project', { ...REQUEST, projectId: 'project-2' }],
			['port', { ...REQUEST, port: 8080 }],
		])('makes a separate URL for another %s', async (_case, other) => {
			const { service, sandbox } = setup();

			const first = await service.open(sandbox, REQUEST);
			const second = await service.open(sandbox, other);

			expect(second.url).not.toBe(first.url);
			expect(service.resolveToken(tokenOf(second.url))).toEqual(
				expect.objectContaining({ userId: other.userId, projectId: other.projectId }),
			);
		});
	});

	describe('resolveToken', () => {
		it.each(['', 'not-a-token', 'a.b.c'])('rejects the malformed token %j', (token) => {
			const { service } = setup();

			expect(service.resolveToken(token)).toBeUndefined();
		});

		it('rejects a token signed for another purpose with the jti of a live entry', async () => {
			const { service, sandbox, jwtService } = setup();
			const { url } = await service.open(sandbox, REQUEST);
			const { jti } = jwtService.decodeUnverified<{ jti: string }>(tokenOf(url));

			const forged = jwtService.sign('session', { sub: 'user-1', jti });

			expect(service.resolveToken(forged)).toBeUndefined();
		});

		it('rejects a preview token for a live entry that names another user', async () => {
			const { service, sandbox, jwtService } = setup();
			const { url } = await service.open(sandbox, REQUEST);
			const { jti } = jwtService.decodeUnverified<{ jti: string }>(tokenOf(url));

			const other = jwtService.sign('sandboxPreview', { sub: 'user-2', jti }, { expiresIn: 60 });

			expect(service.resolveToken(other)).toBeUndefined();
		});

		it('rejects a preview token without the claims it needs', () => {
			const { service, jwtService } = setup();

			expect(service.resolveToken(jwtService.sign('sandboxPreview', { sub: 'user-1' }))).toBe(
				undefined,
			);
			expect(service.resolveToken(jwtService.sign('sandboxPreview', { jti: 'x' }))).toBe(undefined);
		});

		it('rejects a preview token whose entry this process does not hold', () => {
			const { service, jwtService } = setup();

			const token = jwtService.sign('sandboxPreview', { sub: 'user-1', jti: crypto.randomUUID() });

			expect(service.resolveToken(token)).toBeUndefined();
		});

		it('rejects a token with a changed signature', async () => {
			const { service, sandbox } = setup();
			const token = tokenOf((await service.open(sandbox, REQUEST)).url);
			const tampered = `${token.slice(0, -2)}${token.endsWith('AA') ? 'BB' : 'AA'}`;

			expect(service.resolveToken(tampered)).toBeUndefined();
		});

		it('resolves only while the TTL lasts', async () => {
			await fc.assert(
				fc.asyncProperty(fc.integer({ min: 0, max: 2 * TTL_MS }), async (elapsedMs) => {
					vi.setSystemTime(START);
					const { service, sandbox } = setup();
					const token = tokenOf((await service.open(sandbox, REQUEST)).url);

					vi.setSystemTime(START.getTime() + elapsedMs);

					expect(service.resolveToken(token) !== undefined).toBe(elapsedMs < TTL_MS);
				}),
				{ numRuns: 50, examples: [[0], [TTL_MS - 1], [TTL_MS], [2 * TTL_MS]] },
			);
		});

		it('drops an expired entry, so the next open makes a new URL', async () => {
			const { service, sandbox } = setup();
			const first = await service.open(sandbox, REQUEST);

			vi.setSystemTime(START.getTime() + TTL_MS);
			const second = await service.open(sandbox, REQUEST);

			expect(second.url).not.toBe(first.url);
			expect(entryCount(service)).toBe(1);
			expect(service.resolveToken(tokenOf(first.url))).toBeUndefined();
		});
	});

	describe('memory', () => {
		it('drops expired entries when a preview opens, so the entries stay bounded', async () => {
			const { service, sandbox } = setup();
			for (const userId of ['user-1', 'user-2', 'user-3']) {
				await service.open(sandbox, { ...REQUEST, userId });
			}
			expect(entryCount(service)).toBe(3);

			vi.setSystemTime(START.getTime() + TTL_MS);
			await service.open(sandbox, { ...REQUEST, userId: 'user-4' });

			expect(entryCount(service)).toBe(1);
		});

		it('keeps entries that are still valid', async () => {
			const { service, sandbox } = setup();
			await service.open(sandbox, REQUEST);

			vi.setSystemTime(START.getTime() + TTL_MS - 1000);
			await service.open(sandbox, { ...REQUEST, userId: 'user-2' });

			expect(entryCount(service)).toBe(2);
		});
	});

	describe('serviceApiKey', () => {
		it('reads the key of the configured service and reuses it for thirty seconds', async () => {
			const { service, settings, apiKey } = setup();

			await expect(service.serviceApiKey()).resolves.toBe(apiKey);
			vi.setSystemTime(START.getTime() + 30_000 - 1);
			await expect(service.serviceApiKey()).resolves.toBe(apiKey);

			expect(settings.resolveN8nSandboxConfig).toHaveBeenCalledTimes(1);
		});

		it('gives the rotated key to open previews once thirty seconds have passed', async () => {
			const { service, sandbox, settings, apiKey } = setup();
			const { url } = await service.open(sandbox, REQUEST);
			await service.serviceApiKey();
			const rotated = `rotated-${crypto.randomUUID()}`;
			settings.resolveN8nSandboxConfig.mockResolvedValue({ apiKey: rotated });

			await expect(service.serviceApiKey()).resolves.toBe(apiKey);
			vi.setSystemTime(START.getTime() + 30_000);

			await expect(service.serviceApiKey()).resolves.toBe(rotated);
			expect(service.resolveToken(tokenOf(url))).toBeDefined();
		});

		it('reads the key once for requests that ask at the same time', async () => {
			const { service, settings, apiKey } = setup();

			const keys = await Promise.all([service.serviceApiKey(), service.serviceApiKey()]);

			expect(keys).toEqual([apiKey, apiKey]);
			expect(settings.resolveN8nSandboxConfig).toHaveBeenCalledTimes(1);
		});

		it('reads again at once after a failed read', async () => {
			const { service, settings, apiKey } = setup();
			settings.resolveN8nSandboxConfig.mockRejectedValueOnce(new Error('settings not readable'));

			await expect(service.serviceApiKey()).rejects.toThrow('settings not readable');
			await expect(service.serviceApiKey()).resolves.toBe(apiKey);

			expect(settings.resolveN8nSandboxConfig).toHaveBeenCalledTimes(2);
		});

		it('gives undefined when the service has no key', async () => {
			const { service, settings } = setup();
			settings.resolveN8nSandboxConfig.mockResolvedValue({ serviceUrl: ROUTE.serviceUrl });

			await expect(service.serviceApiKey()).resolves.toBeUndefined();
		});
	});

	describe('markDead', () => {
		it('revokes the URL, and the next open makes a new one', async () => {
			const { service, sandbox } = setup();
			const first = await service.open(sandbox, REQUEST);
			const entry = service.resolveToken(tokenOf(first.url));
			if (!entry) throw new Error('The preview did not resolve');

			service.markDead(entry);
			const second = await service.open(sandbox, REQUEST);

			expect(service.resolveToken(tokenOf(first.url))).toBeUndefined();
			expect(second.url).not.toBe(first.url);
			expect(service.resolveToken(tokenOf(second.url))).toBeDefined();
		});

		it('leaves the entry when given a copy that is not the live one', async () => {
			const { service, sandbox } = setup();
			const { url } = await service.open(sandbox, REQUEST);
			const entry = service.resolveToken(tokenOf(url));
			if (!entry) throw new Error('The preview did not resolve');

			service.markDead({ ...entry });

			expect(service.resolveToken(tokenOf(url))).toBe(entry);
		});
	});
});
