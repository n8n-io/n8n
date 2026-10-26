import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { IncomingMessage } from 'node:http';
import { mock } from 'vitest-mock-extended';

import { AppHostService } from '../app-host.service';
import { AppsConfig } from '../../apps.config';

function setup(baseUrl = 'https://apps.example.com', proxyHops = 0) {
	const config = new AppsConfig();
	config.baseUrl = baseUrl;
	return new AppHostService(
		config,
		mock<GlobalConfig>({ proxy_hops: proxyHops }),
		mock<UrlService>({
			getInstanceBaseUrl: () => 'https://n8n.example.net',
			getWebhookBaseUrl: () => 'https://hooks.example.net',
		}),
	);
}

function request(host: string, forwarded?: string) {
	return mock<IncomingMessage>({
		headers: { host, 'x-forwarded-host': forwarded },
		socket: { remoteAddress: '127.0.0.1' },
	});
}

describe('AppHostService', () => {
	it('requires a parent URL', () => {
		expect(() => setup('')).toThrow('Set N8N_APPS_BASE_URL');
	});

	it.each([
		'https://apps.example.com/path',
		'https://user@apps.example.com',
		'https://apps.example.com?x=1',
		'https://n8n.example.net',
		'http://127.0.0.1',
	])('rejects an invalid parent URL: %s', (url) => {
		expect(() => setup(url)).toThrow();
	});

	it('generates canonical URLs with the configured scheme and port', () => {
		expect(setup('http://apps.localhost:5678').origin('sales')).toBe(
			'http://sales.apps.localhost:5678',
		);
	});

	it('accepts valid parent labels with consecutive hyphens', () => {
		expect(setup('https://apps--public.example.com').origin('sales')).toBe(
			'https://sales.apps--public.example.com',
		);
	});

	it.each(['apps.example.com', 'unknown.apps.example.com', 'nested.sales.apps.example.com'])(
		'owns the whole apps range: %s',
		(host) => {
			expect(setup().ownsRequest(request(host))).toBe(true);
		},
	);

	it('only resolves one valid namespace at the configured port', () => {
		const hosts = setup();
		expect(hosts.namespace(request('SALES.apps.example.com'))).toBe('sales');
		expect(hosts.namespace(request('apps.example.com'))).toBeUndefined();
		expect(hosts.namespace(request('sales.apps.example.com:1234'))).toBeUndefined();
		expect(hosts.namespace(request('nested.sales.apps.example.com'))).toBeUndefined();
		expect(hosts.namespace(request(`${'a'.repeat(64)}.apps.example.com`))).toBeUndefined();
	});

	it('ignores forwarded hosts from an untrusted peer', () => {
		expect(setup().ownsRequest(request('n8n.example.net', 'sales.apps.example.com'))).toBe(false);
	});

	it('uses the trusted forwarded host consistently', () => {
		const hosts = setup('https://apps.example.com', 1);
		const appRequest = request('internal:5678', 'sales.apps.example.com');
		expect(hosts.requestHost(appRequest)).toBe('sales.apps.example.com');
		expect(hosts.validRequestHost(appRequest)).toBe(true);
		expect(hosts.ownsRequest(appRequest)).toBe(true);
		expect(hosts.namespace(appRequest)).toBe('sales');
		const conflicting = request('sales.apps.example.com', 'n8n.example.net');
		expect(hosts.requestHost(conflicting)).toBe('n8n.example.net');
		expect(hosts.validRequestHost(conflicting)).toBe(true);
		expect(hosts.ownsRequest(conflicting)).toBe(false);
		expect(hosts.namespace(conflicting)).toBeUndefined();
	});

	it('validates only the effective host selected by the trusted proxy', () => {
		const hosts = setup('https://apps.example.com', 1);
		const valid = request('invalid host', 'sales.apps.example.com');
		expect(hosts.validRequestHost(valid)).toBe(true);
		expect(hosts.ownsRequest(valid)).toBe(true);
		expect(hosts.namespace(valid)).toBe('sales');
		const invalid = request('sales.apps.example.com', 'invalid host');
		expect(hosts.validRequestHost(invalid)).toBe(false);
		expect(hosts.ownsRequest(invalid)).toBe(false);
		expect(hosts.namespace(invalid)).toBeUndefined();
	});
});
