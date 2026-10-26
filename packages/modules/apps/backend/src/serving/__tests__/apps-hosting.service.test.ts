import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Request, RequestHandler, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppHostService } from '../app-host.service';
import { AppsHostingService } from '../apps-hosting.service';

function setup(owned = true) {
	const hosts = mock<AppHostService>({
		baseUrl: new URL('https://apps.example.com'),
	});
	hosts.validRequestHost.mockReturnValue(true);
	hosts.ownsRequest.mockReturnValue(owned);
	hosts.namespace.mockReturnValue('sales');
	const service = new AppsHostingService(hosts, mock<Logger>());
	const req = mock<Request>();
	const res = mock<Response>({ headersSent: false });
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { hosts, service, req, res };
}

describe('AppsHostingService', () => {
	afterEach(() => Container.reset());

	it('passes main requests through and rejects apps upgrades', () => {
		const { service, hosts, req, res } = setup(false);
		const next = vi.fn();
		void service.dispatch(req, res, next);
		expect(next).toHaveBeenCalledOnce();
		expect(service.allowsUpgrade(req)).toBe(true);
		hosts.ownsRequest.mockReturnValue(true);
		expect(service.allowsUpgrade(req)).toBe(false);
	});

	it('rejects requests with an invalid host before main-route passthrough', () => {
		const { service, hosts, req, res } = setup(false);
		hosts.validRequestHost.mockReturnValue(false);
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.sendStatus).toHaveBeenCalledExactlyOnceWith(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('rejects apps-owned requests without a namespace', () => {
		const { service, hosts, req, res } = setup();
		hosts.namespace.mockReturnValue(undefined);
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.sendStatus).toHaveBeenCalledExactlyOnceWith(404);
		expect(next).not.toHaveBeenCalled();
	});

	it('never falls through to main routes when the apps router exits', () => {
		const { service, req, res } = setup();
		const router = service.router as typeof service.router & { handle: RequestHandler };
		vi.spyOn(router, 'handle').mockImplementation((_req, _res, next) => next());
		const next = vi.fn();
		void service.dispatch(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.sendStatus).toHaveBeenCalledWith(404);
	});

	it('returns 400 for a router URIError', () => {
		const { service, req, res } = setup();
		const router = service.router as typeof service.router & { handle: RequestHandler };
		vi.spyOn(router, 'handle').mockImplementation((_req, _res, next) => next(new URIError()));
		const next = vi.fn();

		void service.dispatch(req, res, next);

		expect(res.sendStatus).toHaveBeenCalledExactlyOnceWith(400);
		expect(res.json).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it('returns an uncached public JSON response for a router error', () => {
		const { service, req, res } = setup();
		const router = service.router as typeof service.router & { handle: RequestHandler };
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
		const { service, req, res } = setup();
		const router = service.router as typeof service.router & { handle: RequestHandler };
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
