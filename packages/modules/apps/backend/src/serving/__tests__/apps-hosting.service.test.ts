import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Request, RequestHandler, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppHostService } from '../app-host.service';
import { AppsHostingService } from '../apps-hosting.service';

function setup({ owned = true, sameOrigin = false, basePath = '/' } = {}) {
	const hosts = mock<AppHostService>({
		baseUrl: new URL(basePath, 'https://apps.example.com'),
		sameOrigin,
	});
	hosts.validRequestHost.mockReturnValue(true);
	hosts.ownsRequest.mockReturnValue(owned);
	hosts.namespace.mockReturnValue('sales');
	const service = new AppsHostingService(hosts, mock<Logger>());
	const router = service.router as typeof service.router & { handle: RequestHandler };
	const req = mock<Request>({ method: 'GET', url: '/', originalUrl: '/', baseUrl: '' });
	const res = mock<Response>({ headersSent: false });
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { hosts, service, router, req, res };
}

describe('AppsHostingService', () => {
	afterEach(() => Container.reset());

	it.each([
		['/', '/apps/app-id', '/'],
		['/', '/apps/app-id/_preview', '/'],
		['/n8n/', '/n8n/apps/app-id/assets/main.js?test=1', '/assets/main.js?test=1'],
		['/n8n/', '/n8n/apps/app-id/_preview/_n8n/preview?code=test', '/_n8n/preview?code=test'],
	])('strips the app prefix from %s %s', (basePath, url, expected) => {
		const { hosts, service, router, req, res } = setup({ sameOrigin: true, basePath });
		hosts.namespace.mockReturnValue(undefined);
		hosts.requestAppId.mockReturnValue('app-id');
		req.url = req.originalUrl = url;
		router.use((request, response) => {
			response.send(request.url);
		});
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.send).toHaveBeenCalledExactlyOnceWith(expected);
		expect(res.redirect).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it('passes main requests through and rejects apps upgrades', () => {
		const { service, hosts, req, res } = setup({ owned: false });
		const next = vi.fn();
		void service.dispatch(req, res, next);
		expect(next).toHaveBeenCalledOnce();
		expect(service.allowsUpgrade(req)).toBe(true);
		hosts.ownsRequest.mockReturnValue(true);
		expect(service.allowsUpgrade(req)).toBe(false);
	});

	it('rejects apps-owned requests without a namespace', () => {
		const { service, hosts, req, res } = setup();
		hosts.namespace.mockReturnValue(undefined);
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.sendStatus).toHaveBeenCalledExactlyOnceWith(404);
		expect(next).not.toHaveBeenCalled();
	});

	it('routes preview hosts to the apps router', () => {
		const { service, hosts, router, req, res } = setup();
		hosts.namespace.mockReturnValue(undefined);
		hosts.previewNamespace.mockReturnValue('sales');
		const handle = vi.spyOn(router, 'handle').mockImplementation(() => {});

		void service.dispatch(req, res, vi.fn());

		expect(handle).toHaveBeenCalledOnce();
		expect(res.sendStatus).not.toHaveBeenCalled();
	});

	it('never falls through to main routes when the apps router exits', () => {
		const { service, router, req, res } = setup();
		vi.spyOn(router, 'handle').mockImplementation((_req, _res, next) => next());
		const next = vi.fn();
		void service.dispatch(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.sendStatus).toHaveBeenCalledWith(404);
	});

	it('returns 400 for a router URIError', () => {
		const { service, router, req, res } = setup();
		vi.spyOn(router, 'handle').mockImplementation((_req, _res, next) => next(new URIError()));
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.sendStatus).toHaveBeenCalledExactlyOnceWith(400);
		expect(res.json).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it('returns an uncached public JSON response for a router error', () => {
		const { service, router, req, res } = setup();
		vi.spyOn(router, 'handle').mockImplementation((_req, _res, next) =>
			next(new Error('App lookup failed.')),
		);
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
		expect(res.status).toHaveBeenCalledExactlyOnceWith(500);
		expect(res.json).toHaveBeenCalledExactlyOnceWith({ message: 'Internal server error' });
		expect(next).not.toHaveBeenCalled();
	});

	it('destroys the response when a router error occurs after headers were sent', () => {
		const { service, router, req, res } = setup();
		vi.spyOn(router, 'handle').mockImplementation((_req, _res, next) => next(new Error()));
		Object.defineProperty(res, 'headersSent', { value: true });
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.destroy).toHaveBeenCalledOnce();
		expect(res.sendStatus).not.toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});
});
