import type { Logger } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type {
	INode,
	IWorkflowExecuteAdditionalData,
	IHttpRequestOptions,
	Workflow,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import nock from 'nock';
import type { LookupAddress, LookupOptions } from 'node:dns';

import type { SsrfBridge } from '@/execution-engine';
import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';

import { getRequestHelperFunctions, httpRequest } from '../request-helper-functions';

type DnsResolverLike = {
	lookup(hostname: string, options?: LookupOptions): Promise<LookupAddress[]>;
};

type SsrfProtectionServiceCtor = new (
	config: SsrfProtectionConfig,
	dnsResolver: DnsResolverLike,
	logger: Logger,
) => SsrfBridge;

const { SsrfProtectionService } =
	require('../../../../../../cli/src/services/ssrf/ssrf-protection.service') as {
		SsrfProtectionService: SsrfProtectionServiceCtor;
	};

function createConfig(overrides: Partial<SsrfProtectionConfig> = {}): SsrfProtectionConfig {
	const config = new SsrfProtectionConfig();
	Object.assign(config, overrides);
	return config;
}

function createMockDnsResolver(
	entries: Record<string, LookupAddress[]> = {},
): jest.Mocked<DnsResolverLike> {
	return {
		lookup: jest.fn(async (hostname) => entries[hostname] ?? []),
	};
}

function createSsrfBridge(
	configOverrides: Partial<SsrfProtectionConfig> = {},
	dnsResolver = createMockDnsResolver(),
): { ssrfBridge: SsrfBridge; dnsResolver: jest.Mocked<DnsResolverLike> } {
	const scopedLogger = mock<Logger>();
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnValue(scopedLogger) });
	const config = createConfig(configOverrides);

	const ssrfBridge = new SsrfProtectionService(config, dnsResolver, logger);

	return { ssrfBridge, dnsResolver };
}

function createRequestHelpers(ssrfBridge?: SsrfBridge) {
	const workflow = mock<Workflow>();
	const node = mock<INode>();
	const hooks = mock<ExecutionLifecycleHooks>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks,
		ssrfBridge,
	});

	return getRequestHelperFunctions(workflow, node, additionalData, null, []);
}

describe('SSRF end-to-end integration', () => {
	afterEach(() => {
		nock.cleanAll();
		jest.clearAllMocks();
	});

	test('blocks request to a private IP', async () => {
		const { ssrfBridge } = createSsrfBridge();
		const helpers = createRequestHelpers(ssrfBridge);

		await expect(
			helpers.httpRequest({ method: 'GET', url: 'http://10.0.0.1/secret' }),
		).rejects.toThrow(UserError);
	});

	test('allows request to a public hostname', async () => {
		const dnsResolver = createMockDnsResolver({
			'example.com': [{ address: '93.184.216.34', family: 4 }],
		});
		const { ssrfBridge } = createSsrfBridge({}, dnsResolver);
		const helpers = createRequestHelpers(ssrfBridge);

		nock('https://example.com').get('/api').reply(200, { ok: true });

		await expect(
			helpers.httpRequest({ method: 'GET', url: 'https://example.com/api' }),
		).resolves.toEqual({ ok: true });
		expect(dnsResolver.lookup).toHaveBeenCalledWith('example.com', { all: true });
	});

	test('blocks redirects from public URLs to private IPs', async () => {
		const dnsResolver = createMockDnsResolver({
			'public.example': [{ address: '93.184.216.34', family: 4 }],
		});
		const { ssrfBridge } = createSsrfBridge({}, dnsResolver);
		const helpers = createRequestHelpers(ssrfBridge);

		nock('http://public.example')
			.get('/redirect')
			.reply(301, '', { Location: 'http://192.168.1.1/internal' });

		await expect(
			helpers.httpRequest({ method: 'GET', url: 'http://public.example/redirect' }),
		).rejects.toThrow('IP address is blocked');
	});

	test('allows allowlisted hostname even when it resolves to private IP', async () => {
		const dnsResolver = createMockDnsResolver({
			'internal.corp': [{ address: '10.0.0.5', family: 4 }],
		});
		const { ssrfBridge } = createSsrfBridge({ allowedHostnames: ['internal.corp'] }, dnsResolver);
		const helpers = createRequestHelpers(ssrfBridge);

		nock('http://internal.corp').get('/health').reply(200, { ok: true });

		await expect(
			helpers.httpRequest({ method: 'GET', url: 'http://internal.corp/health' }),
		).resolves.toEqual({ ok: true });
	});

	test('allows private IP within configured allowlisted range', async () => {
		const { ssrfBridge } = createSsrfBridge({ allowedIpRanges: ['10.0.0.0/24'] });
		const helpers = createRequestHelpers(ssrfBridge);

		nock('http://10.0.0.5').get('/internal').reply(200, { ok: true });

		await expect(
			helpers.httpRequest({ method: 'GET', url: 'http://10.0.0.5/internal' }),
		).resolves.toEqual({ ok: true });
	});

	test('passes requests through when ssrfBridge is not provided', async () => {
		const helpers = createRequestHelpers(undefined);

		nock('http://10.0.0.8').get('/open').reply(200, { ok: true });

		await expect(
			helpers.httpRequest({ method: 'GET', url: 'http://10.0.0.8/open' }),
		).resolves.toEqual({
			ok: true,
		});
	});

	test('keeps module-level request helper unguarded for system-level calls', async () => {
		nock('http://10.0.0.9').get('/system').reply(200, { ok: true });

		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'http://10.0.0.9/system',
		};

		await expect(httpRequest(requestOptions)).resolves.toEqual({ ok: true });
	});
});
