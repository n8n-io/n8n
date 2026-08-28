import type { AuthenticatedRequest } from '@n8n/db';
import type { ClientRequest } from 'node:http';
import { vi } from 'vitest';

import { maskIp, setPostHogProxyHeaders } from '../posthog.controller';

describe('maskIp', () => {
	test.each([
		['203.0.113.7', '203.0.113.0'],
		['203.0.113.70', '203.0.113.0'],
		['::ffff:203.0.113.7', '203.0.113.0'],
		['2001:db8:abcd:1234:5678:9abc:def0:1', '2001:db8:abcd::'],
		['2001:db8::1', '2001:db8:0::'],
		['2001::3:4:5:6:7:8', '2001:0:3::'],
		['fe80::1%eth0', 'fe80:0:0::'],
	])('masks %s to %s', (input, expected) => {
		expect(maskIp(input)).toBe(expected);
	});
});

describe('setPostHogProxyHeaders', () => {
	const setup = () => {
		const removeHeader = vi.fn();
		const setHeader = vi.fn();
		const write = vi.fn();
		const proxyReq = { removeHeader, setHeader, write } as unknown as ClientRequest;
		return { proxyReq, removeHeader, setHeader, write };
	};

	const createReq = (overrides: Partial<{ ip: string; method: string; rawBody: Buffer }> = {}) =>
		overrides as AuthenticatedRequest & { rawBody?: Buffer };

	it('forwards the masked client IP as X-PH-Client-IP and strips the cookie', () => {
		const { proxyReq, removeHeader, setHeader } = setup();

		setPostHogProxyHeaders(proxyReq, createReq({ ip: '203.0.113.7', method: 'GET' }));

		expect(removeHeader).toHaveBeenCalledWith('cookie');
		expect(setHeader).toHaveBeenCalledWith('X-PH-Client-IP', '203.0.113.0');
	});

	it('does not set X-PH-Client-IP when the request has no resolved IP', () => {
		const { proxyReq, setHeader } = setup();

		setPostHogProxyHeaders(proxyReq, createReq({ method: 'GET' }));

		expect(setHeader).not.toHaveBeenCalledWith('X-PH-Client-IP', expect.anything());
	});

	it('forwards the raw body and Content-Length for POST requests', () => {
		const { proxyReq, setHeader, write } = setup();
		const rawBody = Buffer.from('{"event":"x"}');

		setPostHogProxyHeaders(proxyReq, createReq({ ip: '203.0.113.7', method: 'POST', rawBody }));

		expect(setHeader).toHaveBeenCalledWith('Content-Length', rawBody.length.toString());
		expect(write).toHaveBeenCalledWith(rawBody);
	});
});
