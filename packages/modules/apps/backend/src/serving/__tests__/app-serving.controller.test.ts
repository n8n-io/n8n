import { EventService } from '@n8n/backend-services';
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
	const events = mock<EventService>();
	const controller = new AppServingController(bundles, auth, hosts, preview, events);
	const req = mock<AppRequest>({
		method: 'GET',
		path: url,
		appContext: {
			app: { id: 'app', publishedVersionId: 'version' },
			versionId: 'version',
			preview: false,
			security: mock({ subject: { id: 'viewer-1' } }),
		},
	});
	const res = mock<Response>({ headersSent: false });
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { controller, req, res, bundles, auth, hosts, preview, events };
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
		req.appContext = { app: mock(), versionId: 'draft', preview: true, previewUserId: 'editor-1' };

		await controller.serve(req, res);

		expect(bundles.get).toHaveBeenCalledWith('draft');
		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({
				'Content-Security-Policy':
					"base-uri 'self'; object-src 'none'; frame-ancestors https://n8n.example.net",
			}),
		);
	});

	it('adds the element inspector to preview HTML with its own ETag', async () => {
		const { controller, req, res } = setup('/');
		req.appContext = { app: mock(), versionId: 'draft', preview: true, previewUserId: 'editor-1' };

		await controller.serve(req, res);

		const sent = (res.send.mock.calls[0][0] as Buffer).toString();
		expect(sent).toContain('<script>');
		expect(sent).toContain('"https://n8n.example.net"');
		expect(res.set).not.toHaveBeenCalledWith(expect.objectContaining({ ETag: '"html"' }));
		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({ ETag: expect.stringMatching(/^W\/"[0-9a-f]{64}"$/) }),
		);
	});

	it('does not add the element inspector to published HTML', async () => {
		const { controller, req, res } = setup('/');

		await controller.serve(req, res);

		expect(res.send).toHaveBeenCalledWith(Buffer.from('app'));
		expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ ETag: '"html"' }));
	});

	it('does not add the element inspector to preview assets', async () => {
		const { controller, req, res } = setup('/assets/main.js', false);
		req.appContext = { app: mock(), versionId: 'draft', preview: true, previewUserId: 'editor-1' };

		await controller.serve(req, res);

		expect(res.send).toHaveBeenCalledWith(Buffer.from('js'));
	});

	it('keeps the published CSP without frame-ancestors', async () => {
		const { controller, req, res } = setup('/assets/main.js', false);

		await controller.serve(req, res);

		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({ 'Content-Security-Policy': "base-uri 'self'; object-src 'none'" }),
		);
	});

	describe('app-opened event', () => {
		it.each(['/', '/orders/123'])('emits once for a page navigation to %s', async (url) => {
			const { controller, req, res, events } = setup(url);

			await controller.serve(req, res);

			expect(events.emit).toHaveBeenCalledExactlyOnceWith('app-opened', {
				appId: 'app',
				versionId: 'version',
				userId: 'viewer-1',
				isPreview: false,
			});
		});

		it('sends the editor of a preview session as the user', async () => {
			const { controller, req, res, events } = setup();
			req.appContext!.preview = true;
			req.appContext!.previewUserId = 'editor-1';

			await controller.serve(req, res);

			expect(events.emit).toHaveBeenCalledExactlyOnceWith('app-opened', {
				appId: 'app',
				versionId: 'version',
				userId: 'editor-1',
				isPreview: true,
			});
		});

		it.each([
			{ case: 'an asset', url: '/assets/main.js', navigation: false },
			{ case: 'a non-navigation request for the page', url: '/', navigation: false },
			{ case: 'a missing asset', url: '/assets/missing.js', navigation: true },
		])('emits nothing for $case', async ({ url, navigation }) => {
			const { controller, req, res, events } = setup(url, navigation);

			await controller.serve(req, res);

			expect(events.emit).not.toHaveBeenCalled();
		});
	});
});
