import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppServingService } from '../app-serving.service';
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
	const service = new AppServingService(bundles, auth);
	const req = mock<AppRequest>({
		method: 'GET',
		path: url,
		appContext: { app: { publishedVersionId: 'version' } },
	});
	const res = mock<Response>();
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { service, req, res, bundles };
}

describe('AppServingService', () => {
	it('serves SPA navigation from the selected published bundle', async () => {
		const { service, req, res, bundles } = setup('/orders/123');
		await service.serve(req, res);
		expect(bundles.get).toHaveBeenCalledWith('version');
		expect(res.send).toHaveBeenCalledWith(Buffer.from('app'));
		expect(res.set).toHaveBeenCalledWith(
			expect.objectContaining({ 'Cache-Control': 'private, no-cache', ETag: '"html"' }),
		);
	});

	it('does not return HTML for missing assets or non-navigation requests', async () => {
		const asset = setup('/assets/missing.js');
		await expect(asset.service.serve(asset.req, asset.res)).rejects.toThrow('file not found');
		const api = setup('/missing', false);
		await expect(api.service.serve(api.req, api.res)).rejects.toThrow('file not found');
	});

	it.each(['/../index.html', '/%2e%2e/index.html', '/assets%5cmain.js', '/%00'])(
		'rejects an invalid request path: %s',
		async (url) => {
			const { service, req, res } = setup(url);
			await expect(service.serve(req, res)).rejects.toThrow('file not found');
		},
	);

	it.each(['/_n8n', '/_n8n/api/missing', '/_n8n/auth/missing', '/%5fn8n/api/missing'])(
		'reserves app infrastructure paths: %s',
		(url) => {
			const { service, req } = setup(url);
			expect(service.isReserved(req)).toBe(true);
		},
	);

	it('does not read cached bytes without a published context', async () => {
		const { service, req, res, bundles } = setup();
		req.appContext = undefined;
		await expect(service.serve(req, res)).rejects.toThrow('App not found');
		expect(bundles.get).not.toHaveBeenCalled();
	});
});
