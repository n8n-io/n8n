import { PAGE, expectHardened, usePreviewHarness } from './sandbox-preview-harness';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

describe('SandboxPreviewProxyController and the sandbox settings', () => {
	const h = usePreviewHarness();
	const { seen, apiKey, openPreview, send } = h;

	afterEach(() => {
		vi.useRealTimers();
	});

	it('sends the key only to the service that the settings name, and ends the URL after a change', async () => {
		const { url, token } = await openPreview();
		const newKey = `new-key-${crypto.randomUUID()}`;
		h.settings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://new-sandbox-service.test',
			apiKey: newKey,
		});

		const changed = await send(`${url}app.js`);
		h.settings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: h.servers.upstreamUrl,
			apiKey,
		});
		const later = await send(`${url}app.js`);

		expect(changed.status).toBe(404);
		expectHardened(changed);
		expect(later.status).toBe(404);
		expect(seen).toHaveLength(0);
		expect(h.previewService.resolveToken(token)).toBeUndefined();
	});

	it('accepts the service URL of the settings with spaces and a trailing slash', async () => {
		const { url } = await openPreview();
		h.settings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: `  ${h.servers.upstreamUrl}//  `,
			apiKey,
		});

		const answer = await send(`${url}app.js`);

		expect(answer.status).toBe(200);
		expect(seen[0].headers['x-api-key']).toBe(apiKey);
	});

	it.each([
		[
			'the agent sandbox is turned off',
			() => h.settings.isAgentSandboxEnabled.mockReturnValue(false),
		],
		['the provider is now Daytona', () => h.settings.getProvider.mockReturnValue('daytona')],
		[
			'the settings name no service URL',
			() => h.settings.resolveN8nSandboxConfig.mockResolvedValue({ apiKey }),
		],
	])('answers 404 without the app when %s, and keeps the URL ended', async (_case, change) => {
		const { url } = await openPreview();
		change();

		const answer = await send(url, { headers: PAGE });
		h.settings.isAgentSandboxEnabled.mockReturnValue(true);
		h.settings.getProvider.mockReturnValue('n8n-sandbox');
		const later = await send(url, { headers: PAGE });

		expect(answer.status).toBe(404);
		expect(later.status).toBe(404);
		expect(seen).toHaveLength(0);
	});

	it('answers 404 to the redirect and the preflight of an ended URL', async () => {
		const { url, token } = await openPreview();
		h.settings.isAgentSandboxEnabled.mockReturnValue(false);

		const redirect = await send(`/sandbox-preview/${token}`);
		const preflight = await send(`${url}api/items`, {
			method: 'OPTIONS',
			headers: { origin: 'null', 'access-control-request-method': 'PUT' },
		});

		expect([redirect.status, preflight.status]).toEqual([404, 404]);
	});

	it('keeps the URL and its service key together while the settings are cached', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const start = Date.now();
		const { url } = await openPreview();
		await send(`${url}app.js`);
		h.settings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://new-sandbox-service.test',
			apiKey: `new-key-${crypto.randomUUID()}`,
		});

		vi.setSystemTime(start + 30_000 - 1);
		const cached = await send(`${url}app.js`);
		vi.setSystemTime(start + 30_000);
		const reread = await send(`${url}app.js`);

		expect(cached.status).toBe(200);
		expect(reread.status).toBe(404);
		// The old service only ever got its own key.
		expect(seen.map((request) => request.headers['x-api-key'])).toEqual([apiKey, apiKey]);
	});

	it('answers 500 and keeps the URL when the settings cannot be read', async () => {
		const { url, token } = await openPreview();
		h.settings.resolveN8nSandboxConfig.mockRejectedValueOnce(new Error('settings not readable'));

		const failed = await send(url, { headers: PAGE });
		const next = await send(url, { headers: PAGE });

		expect(failed.status).toBe(500);
		expect(failed.body).toBe('Internal Server Error');
		expectHardened(failed);
		expect(next.status).toBe(200);
		expect(h.previewService.resolveToken(token)).toBeDefined();
	});
});
