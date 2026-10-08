import type { Logger } from '@n8n/backend-common';
import { createFakeOutboundHttp, type Route } from '@n8n/backend-network/testing';
import { BadRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { SandboxPortCapability } from '../sandbox-port-capability.service';

const SERVICE_URL = 'http://sandbox-service.internal:8080';
const NOT_SUPPORTED = 'This sandbox service cannot show app previews yet.';

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
			}),
		);
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

		expect(error).toBeInstanceOf(BadRequestError);
		expect(error).toHaveProperty('message', NOT_SUPPORTED);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it.each([
		['answers with an error status', healthz({ capabilities: ['ports'] }, 503)],
		['cannot be reached', { pathname: '/healthz', networkError: 'ECONNREFUSED' } as Route],
	])('refuses and logs a service that %s', async (_case, route) => {
		const { capability, logger } = setup([route]);

		await expect(capability.assertSupported(SERVICE_URL)).rejects.toThrow(NOT_SUPPORTED);

		expect(logger.warn).toHaveBeenCalledWith(
			'Could not read the sandbox service capabilities',
			expect.objectContaining({ error: expect.any(String) }),
		);
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
});
