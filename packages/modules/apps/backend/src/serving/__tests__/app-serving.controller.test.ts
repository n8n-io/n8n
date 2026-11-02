import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppServingController } from '../app-serving.controller';
import { AppBundleCache } from '../app-bundle-cache';
import { AppHostService } from '../app-host.service';
import { AppAuthService, type AppRequest } from '../../auth/app-auth.service';
import { AppPreviewService } from '../../preview/app-preview.service';

function setup(url = '/', navigation = true) {
	const bundles = mock<AppBundleCache>();
	bundles.get.mockResolvedValue(
		new Map([
			['index.html', { body: Buffer.from('app'), contentType: 'text/html', etag: '"html"' }],
			[
				'assets/main.js',
				{ body: Buffer.from('js'), contentType: 'application/javascript', etag: '"js"' },
			],
		]),
	);
	const auth = mock<AppAuthService>({ isNavigation: () => navigation });
	const hosts = mock<AppHostService>();
	const preview = mock<AppPreviewService>({ editorOrigin: 'https://n8n.example.net' });
	const controller = new AppServingController(bundles, auth, hosts, preview);
	const req = mock<AppRequest>({
		method: 'GET',
		path: url,
		appContext: { app: { publishedVersionId: 'version' }, versionId: 'version', preview: false },
	});
	const res = mock<Response>({ headersSent: false });
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { controller, req, res, bundles, auth, hosts, preview };
}

describe('AppServingController', () => {
	it('serves an existing asset with its content type and ETag', async () => {
		const { controller, req, res, bundles } = setup('/assets/main.js', false);

		await controller.serve(req, res);

		expect(bundles.get).toHaveBeenCalledWith('version');
		expect(res.send).toHaveBeenCalledWith(Buffer.from('js'));
		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({ 'Content-Type': 'application/javascript', ETag: '"js"' }),
		);
	});

	it('serves SPA navigation from the selected published bundle', async () => {
		const { controller, req, res, bundles } = setup('/orders/123');
		await controller.serve(req, res);
		expect(bundles.get).toHaveBeenCalledWith('version');
		expect(res.send).toHaveBeenCalledWith(Buffer.from('app'));
		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({ 'Cache-Control': 'private, no-cache', ETag: '"html"' }),
		);
	});

	it('does not return HTML for missing assets or non-navigation requests', async () => {
		const asset = setup('/assets/missing.js');
		await asset.controller.serve(asset.req, asset.res);
		expect(asset.res.status).toHaveBeenCalledWith(404);
		const api = setup('/missing', false);
		await api.controller.serve(api.req, api.res);
		expect(api.res.status).toHaveBeenCalledWith(404);
	});

	it.each(['/../index.html', '/%2e%2e/index.html', '/assets%5cmain.js', '/%00'])(
		'rejects an invalid request path: %s',
		async (url) => {
			const { controller, req, res, auth } = setup(url);
			await expect(controller.authenticate(req, res, vi.fn())).rejects.toThrow('file not found');
			expect(auth.authenticate).not.toHaveBeenCalled();
		},
	);

	it.each(['/_n8n', '/_n8n/api/missing', '/_n8n/auth/missing', '/%5fn8n/api/missing'])(
		'reserves app infrastructure paths: %s',
		async (url) => {
			const { controller, req, res, auth } = setup(url);
			const next = vi.fn();
			await controller.authenticate(req, res, next);
			expect(res.sendStatus).toHaveBeenCalledWith(404);
			expect(auth.authenticate).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		},
	);

	it('does not read cached bytes without a published context', async () => {
		const { controller, req, res, bundles } = setup();
		req.appContext = undefined;
		await controller.serve(req, res);
		expect(res.status).toHaveBeenCalledWith(404);
		expect(bundles.get).not.toHaveBeenCalled();
	});

	it.each([
		{ host: 'preview', namespace: 'sales', expected: 'preview', skipped: 'auth' },
		{ host: 'published', namespace: undefined, expected: 'auth', skipped: 'preview' },
	] as const)(
		'authenticates $host hosts with the $expected session',
		async ({ namespace, expected, skipped }) => {
			const context = setup();
			const { controller, req, res, hosts } = context;
			hosts.previewNamespace.mockReturnValue(namespace);
			const next = vi.fn();

			await controller.authenticate(req, res, next);

			expect(context[expected].authenticate).toHaveBeenCalledExactlyOnceWith(req, res, next);
			expect(context[skipped].authenticate).not.toHaveBeenCalled();
		},
	);

	it('serves the preview version and allows only the editor to frame it', async () => {
		const { controller, req, res, bundles } = setup('/assets/main.js', false);
		req.appContext = { app: mock(), versionId: 'draft', preview: true };

		await controller.serve(req, res);

		expect(bundles.get).toHaveBeenCalledWith('draft');
		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({
				'Content-Security-Policy':
					"base-uri 'self'; object-src 'none'; frame-ancestors https://n8n.example.net",
			}),
		);
	});

	it('keeps the published CSP without frame-ancestors', async () => {
		const { controller, req, res } = setup('/assets/main.js', false);

		await controller.serve(req, res);

		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({ 'Content-Security-Policy': "base-uri 'self'; object-src 'none'" }),
		);
	});
});
