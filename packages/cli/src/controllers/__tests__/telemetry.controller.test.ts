import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { NextFunction, Response } from 'express';
import { mock } from 'jest-mock-extended';

type ProxyResponse = { headers: Record<string, string> };
type ProxyErrorResponse = {
	headersSent?: boolean;
	writeHead: jest.Mock;
	end: jest.Mock;
};
type ProxyOptions = {
	on?: {
		proxyReq?: (proxyReq: { removeHeader: jest.Mock }, req: AuthenticatedRequest) => void;
		proxyRes?: (proxyRes: ProxyResponse) => void;
		error?: (error: Error, req: AuthenticatedRequest, res: ProxyErrorResponse) => void;
	};
};

const mockProxy = jest.fn();
const mockFixRequestBody = jest.fn();
let mockProxyOptions: ProxyOptions | undefined;

jest.mock('http-proxy-middleware', () => ({
	createProxyMiddleware: jest.fn((options: ProxyOptions) => {
		mockProxyOptions = options;
		return mockProxy;
	}),
	fixRequestBody: mockFixRequestBody,
}));

import { TelemetryController } from '../telemetry.controller';

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	TelemetryController as never,
);
const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

function createController(outboundHttp: OutboundHttp = mock<OutboundHttp>()) {
	return new TelemetryController(
		mock<GlobalConfig>({
			diagnostics: {
				frontendConfig: 'test-key;https://telemetry.n8n.io',
			},
		}),
		outboundHttp,
	);
}

function createResponse() {
	const res = {
		setHeader: jest.fn(),
		removeHeader: jest.fn(),
		status: jest.fn(),
		end: jest.fn(),
		json: jest.fn(),
	};
	res.status.mockReturnValue(res);
	return res as unknown as jest.Mocked<Response>;
}

function createRequest(headers: Record<string, string> = {}) {
	return { headers } as AuthenticatedRequest;
}

function getProxyOptions() {
	if (!mockProxyOptions) throw new Error('Proxy options were not captured');
	return mockProxyOptions;
}

describe('TelemetryController route access', () => {
	it.each(routeCases)('$handlerName is unauthenticated and ungated', ({ route }) => {
		expect(route.skipAuth).toBe(true);
		expect(route.accessScope).toBeUndefined();
	});
});

describe('TelemetryController', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockProxy.mockResolvedValue(undefined);
		mockProxyOptions = undefined;
	});

	it('responds to proxy preflight requests with permissive reflected CORS headers', () => {
		const controller = createController();
		const req = createRequest({
			'access-control-request-headers': 'content-type,authorization,anonymousid',
		});
		const res = createResponse();

		controller.proxyPreflight(req, res);

		expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		expect(res.setHeader).toHaveBeenCalledWith(
			'Access-Control-Allow-Methods',
			'GET, POST, OPTIONS',
		);
		expect(res.setHeader).toHaveBeenCalledWith(
			'Access-Control-Allow-Headers',
			'content-type,authorization,anonymousid',
		);
		expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '600');
		expect(res.removeHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials');
		expect(res.status).toHaveBeenCalledWith(204);
		expect(res.end).toHaveBeenCalled();
	});

	it('applies CORS before proxying track calls', async () => {
		const controller = createController();
		const req = createRequest();
		const res = createResponse();
		const next = jest.fn() as NextFunction;

		await controller.track(req, res, next);

		expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		expect(mockProxy).toHaveBeenCalledWith(req, res, next);
	});

	it('keeps proxy request body handling and strips cookies', () => {
		createController();
		const proxyReq = { removeHeader: jest.fn() };
		const req = createRequest();

		getProxyOptions().on?.proxyReq?.(proxyReq, req);

		expect(proxyReq.removeHeader).toHaveBeenCalledWith('cookie');
		expect(mockFixRequestBody).toHaveBeenCalledWith(proxyReq, req);
	});

	it('normalizes upstream CORS headers on proxied responses', () => {
		createController();
		const proxyRes: ProxyResponse = {
			headers: {
				'access-control-allow-origin': 'https://upstream.example.com',
				'access-control-allow-credentials': 'true',
				'access-control-allow-methods': 'POST',
				'access-control-allow-headers': 'authorization',
				'access-control-expose-headers': 'x-test',
				'x-test': 'kept',
			},
		};

		getProxyOptions().on?.proxyRes?.(proxyRes);

		expect(proxyRes.headers).toEqual({
			'access-control-allow-origin': '*',
			'x-test': 'kept',
		});
	});

	it('returns CORS on proxy errors', () => {
		createController();
		const req = createRequest();
		const res: ProxyErrorResponse = {
			headersSent: false,
			writeHead: jest.fn(),
			end: jest.fn(),
		};

		getProxyOptions().on?.error?.(new Error('upstream unavailable'), req, res);

		expect(res.writeHead).toHaveBeenCalledWith(502, {
			'Access-Control-Allow-Origin': '*',
		});
		expect(res.end).toHaveBeenCalledWith('Bad Gateway');
	});

	it('applies CORS while serving RudderStack source config', async () => {
		const httpClient = mock<HttpRequestClient>();
		const requestMock = httpClient.request as jest.Mock;
		requestMock.mockResolvedValue({ statusCode: 200, body: { source: 'config' } });
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(httpClient);

		const controller = createController(outboundHttp);
		const req = createRequest();
		const res = createResponse();

		await controller.sourceConfig(req, res);

		expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		expect(outboundHttp.requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
		expect(requestMock).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: 'https://api-rs.n8n.io/sourceConfig',
				headers: {
					authorization: `Basic ${btoa('test-key:')}`,
				},
			}),
		);
		expect(res.json).toHaveBeenCalledWith({ source: 'config' });
	});
});
