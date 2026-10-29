import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppServingController } from '../app-serving.controller';
import { AppBundleCache } from '../app-bundle-cache';
import { AppAuthService, type AppRequest } from '../../auth/app-auth.service';

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
	const controller = new AppServingController(bundles, auth);
	const req = mock<AppRequest>({
		method: 'GET',
		path: url,
		appContext: { app: { publishedVersionId: 'version' } },
	});
	const res = mock<Response>({ headersSent: false });
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { controller, req, res, bundles, auth };
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
});
