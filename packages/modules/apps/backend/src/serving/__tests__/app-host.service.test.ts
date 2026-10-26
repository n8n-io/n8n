import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { IncomingMessage } from 'node:http';
import { mock } from 'vitest-mock-extended';

import { AppHostService } from '../app-host.service';
import { AppsConfig } from '../../apps.config';

function setup({
	baseUrl = 'https://apps.example.com',
	proxyHops = 0,
	deploymentType = 'default',
	host = 'n8n.example.net',
} = {}) {
	const config = new AppsConfig();
	config.baseUrl = baseUrl;
	return new AppHostService(
		config,
		mock<GlobalConfig>({
			proxy_hops: proxyHops,
			host,
			deployment: mock<GlobalConfig['deployment']>({ type: deploymentType }),
		}),
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
		expect(() => setup({ baseUrl: '' })).toThrow('Set N8N_APPS_BASE_URL');
	});

	it.each([
		'https://apps.example.com/path',
		'https://user@apps.example.com',
		'https://apps.example.com?x=1',
		'https://n8n.example.net',
		'http://127.0.0.1',
	])('rejects an invalid parent URL: %s', (url) => {
		expect(() => setup({ baseUrl: url })).toThrow();
	});

	it('generates canonical URLs with the configured scheme and port', () => {
		expect(setup({ baseUrl: 'http://apps.localhost:5678' }).origin('sales')).toBe(
			'http://sales.apps.localhost:5678',
		);
	});

	it('accepts valid parent labels with consecutive hyphens', () => {
		expect(setup({ baseUrl: 'https://apps--public.example.com' }).origin('sales')).toBe(
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
		const hosts = setup({ proxyHops: 1 });
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
		const hosts = setup({ proxyHops: 1 });
		const valid = request('invalid host', 'sales.apps.example.com');
		expect(hosts.validRequestHost(valid)).toBe(true);
		expect(hosts.ownsRequest(valid)).toBe(true);
		expect(hosts.namespace(valid)).toBe('sales');
		const invalid = request('sales.apps.example.com', 'invalid host');
		expect(hosts.validRequestHost(invalid)).toBe(false);
		expect(hosts.ownsRequest(invalid)).toBe(false);
		expect(hosts.namespace(invalid)).toBeUndefined();
	});

	describe('Cloud hosts', () => {
		const cloud = { deploymentType: 'cloud', host: 'foo.app.n8n.cloud' };

		it('uses the configured instance host for app and callback URLs', () => {
			const hosts = setup(cloud);

			expect(hosts.origin('sales')).toBe('https://sales--foo.apps.example.com');
			expect(hosts.callbackUrl({ id: 'app-id', namespace: 'sales' })).toBe(
				'https://sales--foo.apps.example.com/_n8n/auth/app-id/callback',
			);
			expect(setup({ host: cloud.host }).origin('sales')).toBe('https://sales.apps.example.com');
		});

		it('only resolves namespaces for the configured instance', () => {
			const hosts = setup({ ...cloud, proxyHops: 1 });

			expect(hosts.namespace(request('internal:5678', 'SALES--FOO.apps.example.com'))).toBe(
				'sales',
			);
			for (const host of [
				'sales--bar.apps.example.com',
				'foo--sales.apps.example.com',
				'sales.apps.example.com',
				'--foo.apps.example.com',
				'sales--foo.extra.apps.example.com',
				'sales--foo.apps.example.com:1234',
			]) {
				expect(hosts.ownsRequest(request(host))).toBe(true);
				expect(hosts.namespace(request(host))).toBeUndefined();
			}
		});

		it('limits the combined instance and app label to 63 characters', () => {
			const hosts = setup(cloud);
			const namespace = 'a'.repeat(58);
			const origin = `https://${namespace}--foo.apps.example.com`;

			expect(hosts.origin(namespace)).toBe(origin);
			expect(hosts.namespace(request(new URL(origin).host))).toBe(namespace);
			expect(hosts.origin(namespace + 'a')).toBeNull();
			expect(hosts.namespace(request(`${namespace}a--foo.apps.example.com`))).toBeUndefined();
		});

		it('includes the instance suffix in the full hostname length limit', () => {
			const parent = ['a'.repeat(63), 'b'.repeat(63), 'c'.repeat(63), 'd'.repeat(53)].join('.');
			const hosts = setup({ ...cloud, baseUrl: `https://${parent}` });

			expect(hosts.origin('ab')).toBe(`https://ab--foo.${parent}`);
			expect(hosts.origin('abc')).toBeNull();
		});

		it('rejects an instance name that cannot form an app host', () => {
			expect(() => setup({ ...cloud, host: 'invalid_name.app.n8n.cloud' })).toThrow('Set N8N_HOST');
		});
	});
});
