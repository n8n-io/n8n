import type { SandboxPortRoute, WorkspaceSandbox } from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import { createFakeOutboundHttp, type Route } from '@n8n/backend-network/testing';
import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import {
	SandboxPortCapability,
	SandboxPreviewUnavailableError,
} from '../sandbox-port-capability.service';

const SERVICE_URL = 'http://sandbox-service.internal:8080';
const NOT_SUPPORTED = 'This sandbox service cannot show app previews yet.';
const UNREACHABLE =
	'Could not reach the sandbox service to open the app preview. Try again in a moment.';

function setup(routes: Route[]) {
	const fake = createFakeOutboundHttp(
		routes,
		vi.fn as unknown as Parameters<typeof createFakeOutboundHttp>[1],
	);
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const capability = new SandboxPortCapability(logger, fake.outboundHttp);
	return { capability, logger, ...fake };
}

const healthz = (body: unknown, status = 200): Route => ({ pathname: '/healthz', status, body });

describe('SandboxPortCapability', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-10-08T10:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('accepts a service that lists the ports capability', async () => {
		const { capability, httpRequest, requests, logger } = setup([
			healthz({ status: 'ok', capabilities: ['exec', 'ports'] }),
		]);

		await expect(capability.assertSupported(SERVICE_URL)).resolves.toBeUndefined();

		expect(logger.scoped).toHaveBeenCalledWith('agents');
		expect(requests).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'unsafe' });
		expect(httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: `${SERVICE_URL}/healthz`,
				json: true,
				timeout: 3_000,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			}),
		);
	});

	it('accepts a supported answer that has more fields than it reads', async () => {
		const { capability } = setup([
			healthz({ status: 'ok', version: '2.0.0', capabilities: ['ports'], uptime: 10 }),
		]);

		await expect(capability.assertSupported(SERVICE_URL)).resolves.toBeUndefined();
	});

	it.each([
		['lists other capabilities only', { capabilities: ['exec'] }],
		['has no capabilities field (older service)', { status: 'ok' }],
		['sends capabilities that are not a list', { capabilities: 'ports' }],
		['sends no JSON object', 'ok'],
		['sends an empty body', null],
	])('refuses a service that %s', async (_case, body) => {
		const { capability, logger } = setup([healthz(body)]);

		const error = await capability.assertSupported(SERVICE_URL).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(SandboxPreviewUnavailableError);
		expect(error).toBeInstanceOf(BadRequestError);
		expect(error).toHaveProperty('message', NOT_SUPPORTED);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it.each([
		['has no /healthz route (404)', 404],
		['refuses the request (403)', 403],
		['answers 499, the last client error', 499],
	])('refuses a service that %s, without a fault', async (_case, status) => {
		const { capability, logger } = setup([healthz({ capabilities: ['ports'] }, status)]);

		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(NOT_SUPPORTED);

		expect(logger.warn).not.toHaveBeenCalled();
	});

	it.each([
		['answers 500', healthz({ capabilities: ['ports'] }, 500)],
		['answers 503', healthz({ capabilities: ['ports'] }, 503)],
		['cannot be reached', { pathname: '/healthz', networkError: 'ECONNREFUSED' } as Route],
	])('answers 503 and logs when the service %s', async (_case, route) => {
		const { capability, logger } = setup([route]);

		const error = await capability.assertSupported(SERVICE_URL).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(ServiceUnavailableError);
		expect(error).toHaveProperty('message', UNREACHABLE);
		expect(error).toHaveProperty('httpStatusCode', 503);
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not read the sandbox service capabilities',
			expect.objectContaining({ error: expect.any(String) }),
		);
	});

	it('does not keep a fault, so the next preview asks the service again', async () => {
		const { capability, httpRequest } = setup([
			{ pathname: '/healthz', networkError: 'ECONNREFUSED' },
			healthz({ capabilities: ['ports'] }, 503),
			healthz({ capabilities: ['ports'] }),
		]);

		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(UNREACHABLE);
		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(UNREACHABLE);
		await expect(capability.assertSupported(SERVICE_URL)).resolves.toBeUndefined();

		expect(httpRequest).toHaveBeenCalledTimes(3);
	});

	it('keeps a 4xx answer like a missing capability, for thirty seconds', async () => {
		const { capability, httpRequest } = setup([
			healthz({}, 404),
			healthz({ capabilities: ['ports'] }),
		]);

		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(NOT_SUPPORTED);
		vi.advanceTimersByTime(30_000 - 1);
		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(NOT_SUPPORTED);
		expect(httpRequest).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		await expect(capability.assertSupported(SERVICE_URL)).resolves.toBeUndefined();
	});

	it('trusts a supported answer for ten minutes', async () => {
		const { capability, httpRequest } = setup([healthz({ capabilities: ['ports'] })]);

		await capability.assertSupported(SERVICE_URL);
		vi.advanceTimersByTime(10 * 60_000 - 1);
		await capability.assertSupported(SERVICE_URL);
		expect(httpRequest).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		await capability.assertSupported(SERVICE_URL);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('asks again after thirty seconds when the capability was missing', async () => {
		const { capability, httpRequest } = setup([
			healthz({ capabilities: [] }),
			healthz({ capabilities: ['ports'] }),
		]);

		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(NOT_SUPPORTED);
		vi.advanceTimersByTime(30_000 - 1);
		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(NOT_SUPPORTED);
		expect(httpRequest).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		await expect(capability.assertSupported(SERVICE_URL)).resolves.toBeUndefined();
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('keeps one answer for each service URL', async () => {
		const other = 'http://other-sandbox-service.internal';
		const { capability, httpRequest } = setup([healthz({ capabilities: ['ports'] })]);

		await capability.assertSupported(SERVICE_URL);
		await capability.assertSupported(other);
		await capability.assertSupported(SERVICE_URL);

		expect(httpRequest.mock.calls.map(([options]) => options.url)).toEqual([
			`${SERVICE_URL}/healthz`,
			`${other}/healthz`,
		]);
	});

	describe('resolveRoute', () => {
		const ROUTE: SandboxPortRoute = { serviceUrl: SERVICE_URL, path: '/sandboxes/sb-1/ports/5173' };

		const sandboxWith = (getPortRoute: WorkspaceSandbox['getPortRoute']) =>
			mock<WorkspaceSandbox>({ getPortRoute });

		it('returns the route of the port on a service with the ports capability', async () => {
			const getPortRoute = vi.fn().mockResolvedValue(ROUTE);
			const { capability, httpRequest } = setup([healthz({ capabilities: ['ports'] })]);

			await expect(capability.resolveRoute(sandboxWith(getPortRoute), 5173)).resolves.toEqual(
				ROUTE,
			);

			expect(getPortRoute).toHaveBeenCalledWith(5173);
			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: `${SERVICE_URL}/healthz` }),
			);
		});

		it('refuses a sandbox that has no port route, without asking the service', async () => {
			const { capability, httpRequest } = setup([healthz({ capabilities: ['ports'] })]);

			const error = await capability
				.resolveRoute(sandboxWith(undefined), 5173)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(SandboxPreviewUnavailableError);
			expect(error).toBeInstanceOf(BadRequestError);
			expect(error).toHaveProperty('message', 'This sandbox cannot show app previews');
			expect(httpRequest).not.toHaveBeenCalled();
		});

		it('answers 503 and logs the cause when the port route cannot be found', async () => {
			const getPortRoute = vi.fn().mockRejectedValue(new Error('sandbox service unavailable'));
			const { capability, httpRequest, logger } = setup([healthz({ capabilities: ['ports'] })]);

			const error = await capability
				.resolveRoute(sandboxWith(getPortRoute), 5173)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(ServiceUnavailableError);
			expect(error).toHaveProperty('message', UNREACHABLE);
			expect(logger.warn).toHaveBeenCalledWith('Could not find the port route of the sandbox', {
				error: 'sandbox service unavailable',
			});
			expect(httpRequest).not.toHaveBeenCalled();
		});

		it('refuses the route of a service without the ports capability', async () => {
			const getPortRoute = vi.fn().mockResolvedValue(ROUTE);
			const { capability } = setup([healthz({ capabilities: ['exec'] })]);

			await expect(capability.resolveRoute(sandboxWith(getPortRoute), 5173)).rejects.toThrow(
				NOT_SUPPORTED,
			);
		});
	});
});
