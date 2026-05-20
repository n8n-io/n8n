import { HttpRequestConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { INode, IWorkflowExecuteAdditionalData, Workflow } from 'n8n-workflow';
import nock from 'nock';

import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';

import { buildRfcStyleUserAgent, getDefaultN8nOutboundUserAgent } from '../outbound-user-agent';
import { httpRequest, proxyRequestToAxios } from '../request-helper-functions';

/** Exercises the full httpRequest → axios path for outbound User-Agent resolution. */
describe('Outbound User-Agent (httpRequest integration)', () => {
	const baseUrl = 'https://example.com';
	const originalConfig = new HttpRequestConfig();

	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
		Container.set(HttpRequestConfig, { ...originalConfig });
	});

	it('sends legacy "n8n" User-Agent when enforcement flag is off (default)', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: false,
			globalUserAgentValue: '',
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'n8n' },
		})
			.get('/legacy')
			.reply(200, { success: true });

		await expect(httpRequest({ method: 'GET', url: `${baseUrl}/legacy` })).resolves.toEqual({
			success: true,
		});

		scope.done();
	});

	it('sends RFC-style User-Agent when enforcement flag is on', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: '',
		});

		const scope = nock(baseUrl, {
			reqheaders: {
				'user-agent': /^Mozilla\/5\.0 \(compatible; n8n\/.+; \+https:\/\/n8n\.io\/\)$/,
			},
		})
			.get('/rfc-default')
			.reply(200, { success: true });

		await expect(httpRequest({ method: 'GET', url: `${baseUrl}/rfc-default` })).resolves.toEqual({
			success: true,
		});

		scope.done();
	});

	it('sends the custom User-Agent value when both flag and value are set', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: 'AcmeCorp/2.0',
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'AcmeCorp/2.0' },
		})
			.get('/custom')
			.reply(200, { success: true });

		await expect(httpRequest({ method: 'GET', url: `${baseUrl}/custom` })).resolves.toEqual({
			success: true,
		});

		scope.done();
	});

	it('uses the RFC-style UA via getDefaultN8nOutboundUserAgent helper', () => {
		expect(buildRfcStyleUserAgent('9.9.9')).toBe(
			'Mozilla/5.0 (compatible; n8n/9.9.9; +https://n8n.io/)',
		);

		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: '',
		});
		expect(getDefaultN8nOutboundUserAgent()).toMatch(
			/^Mozilla\/5\.0 \(compatible; n8n\/.+; \+https:\/\/n8n\.io\/\)$/,
		);
	});
});

/**
 * Exercises the legacy proxyRequestToAxios → axios path (used by HTTP Request node
 * and many built-in nodes via helpers.request / helpers.requestWithAuthentication).
 */
describe('Outbound User-Agent (proxyRequestToAxios integration)', () => {
	const baseUrl = 'https://legacy.example.com';
	const originalConfig = new HttpRequestConfig();
	const workflow = mock<Workflow>();
	const node = mock<INode>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks: mock<ExecutionLifecycleHooks>(),
		ssrfBridge: undefined,
	});

	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
		Container.set(HttpRequestConfig, { ...originalConfig });
	});

	it('sends legacy "n8n" User-Agent when enforcement flag is off (default)', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: false,
			globalUserAgentValue: '',
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'n8n' },
		})
			.get('/legacy')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/legacy`,
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});

	it('sends RFC-style User-Agent when enforcement flag is on', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: '',
		});

		const scope = nock(baseUrl, {
			reqheaders: {
				'user-agent': /^Mozilla\/5\.0 \(compatible; n8n\/.+; \+https:\/\/n8n\.io\/\)$/,
			},
		})
			.get('/rfc-default')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/rfc-default`,
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});

	it('sends the custom User-Agent value when both flag and value are set', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: 'AcmeCorp/2.0',
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'AcmeCorp/2.0' },
		})
			.get('/custom')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/custom`,
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});

	it('preserves a caller-supplied User-Agent header', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: 'AcmeCorp/2.0',
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'MyCustomNode/1.0' },
		})
			.get('/preserved')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/preserved`,
				headers: { 'User-Agent': 'MyCustomNode/1.0' },
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});
});
