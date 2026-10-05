import type { Logger } from '@n8n/backend-common';
import type { INode } from 'n8n-workflow';
import { WEBHOOK_NODE_TYPE, WEBPAGE_NODE_TYPE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	isOAuthProtectedWebhookNode,
	methodQueryString,
	parseMethodParam,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
	webhookAllowsBrowserFlow,
	webhookPathFromResourceUrl,
	webhookRequiresExecuteAccess,
	webhookResourcePath,
} from '../utils';

const node = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-1',
	name: 'Node',
	type: WEBPAGE_NODE_TYPE,
	typeVersion: 1,
	position: [0, 0],
	parameters: { authentication: 'n8nOAuth2' },
	...overrides,
});

describe('webhookResourcePath', () => {
	test('should return the path itself for a static webhook', () => {
		expect(webhookResourcePath('user/defined/path')).toBe('user/defined/path');
	});

	test('should prefix the webhookId for a dynamic webhook', () => {
		expect(webhookResourcePath('user/:id/posts', 'wh-1')).toBe('wh-1/user/:id/posts');
	});

	test('should not prefix a static path that merely contains a colon', () => {
		// a row only carries a webhookId when a segment *starts* with `:`
		expect(webhookResourcePath('orders:2024')).toBe('orders:2024');
		expect(webhookResourcePath('at/time:12')).toBe('at/time:12');
	});
});

describe('resourceUrlToWebhookPath', () => {
	test('should return the path for a URL under a root-mounted base URL', () => {
		expect(resourceUrlToWebhookPath('https://host.example/mcp/abc', 'https://host.example/')).toBe(
			'/mcp/abc',
		);
		// base URL without a trailing slash resolves the same way
		expect(resourceUrlToWebhookPath('https://host.example/mcp/abc', 'https://host.example')).toBe(
			'/mcp/abc',
		);
	});

	test('should strip the base URL path prefix for a sub-path deployment', () => {
		expect(
			resourceUrlToWebhookPath('https://host.example/n8n/mcp/abc', 'https://host.example/n8n/'),
		).toBe('/mcp/abc');
	});

	test('should reject a URL that omits the base URL path prefix', () => {
		// without the `/n8n` prefix the URL is not actually served by this instance,
		// so it must not resolve to the prefixed resource
		expect(
			resourceUrlToWebhookPath('https://host.example/mcp/abc', 'https://host.example/n8n/'),
		).toBeUndefined();
	});

	test('should reject a foreign origin', () => {
		expect(
			resourceUrlToWebhookPath('https://evil.example/mcp/abc', 'https://host.example/'),
		).toBeUndefined();
		// origin includes the port
		expect(
			resourceUrlToWebhookPath('https://host.example:9000/mcp/abc', 'https://host.example/'),
		).toBeUndefined();
	});

	test('should return undefined for a malformed resource URL', () => {
		expect(resourceUrlToWebhookPath('not-a-url', 'https://host.example/')).toBeUndefined();
	});

	test('should drop the query string', () => {
		// the query reaches resolvers separately, so it must never end up in the path
		expect(
			resourceUrlToWebhookPath('https://host.example/mcp/abc?foo=bar', 'https://host.example/'),
		).toBe('/mcp/abc');
		expect(
			resourceUrlToWebhookPath(
				'https://host.example/webhook/abc?method=GET',
				'https://host.example/',
			),
		).toBe('/webhook/abc');
	});
});

describe('webhookPathFromResourceUrl', () => {
	const logger = mock<Logger>();

	beforeEach(() => {
		logger.debug.mockClear();
	});

	test('should return the path and not log for a URL under the base URL', () => {
		expect(
			webhookPathFromResourceUrl(
				'https://host.example/n8n/webhook/abc?method=GET',
				'https://host.example/n8n/',
				logger,
			),
		).toBe('/webhook/abc');
		expect(logger.debug).not.toHaveBeenCalled();
	});

	test('should log and return undefined for a URL outside the base URL', () => {
		expect(
			webhookPathFromResourceUrl(
				'https://evil.example/webhook/abc',
				'https://host.example/',
				logger,
			),
		).toBeUndefined();
		expect(logger.debug).toHaveBeenCalledWith(
			'Resource URL is not under the webhook base URL: https://evil.example/webhook/abc',
		);
	});

	test('should log and return undefined for a malformed resource URL', () => {
		expect(
			webhookPathFromResourceUrl('not-a-url', 'https://host.example/', logger),
		).toBeUndefined();
		expect(logger.debug).toHaveBeenCalledTimes(1);
	});
});

describe('method selector helpers', () => {
	test('methodQueryString upper-cases the method', () => {
		expect(methodQueryString('GET')).toBe('?method=GET');
		expect(methodQueryString('post')).toBe('?method=POST');
	});

	test('parseMethodParam canonicalises and returns undefined when absent', () => {
		expect(parseMethodParam('post')).toBe('POST');
		expect(parseMethodParam(' get ')).toBe('GET');
		expect(parseMethodParam(null)).toBeUndefined();
		expect(parseMethodParam(undefined)).toBeUndefined();
		expect(parseMethodParam('')).toBeUndefined();
		expect(parseMethodParam('  ')).toBeUndefined();
	});

	test('methodQueryString and parseMethodParam round-trip', () => {
		expect(parseMethodParam(methodQueryString('post').replace('?method=', ''))).toBe('POST');
	});
});

describe('trimSlashes / trimTrailingSlash', () => {
	test('trimTrailingSlash removes a single trailing slash', () => {
		expect(trimTrailingSlash('https://host.example/')).toBe('https://host.example');
		expect(trimTrailingSlash('https://host.example')).toBe('https://host.example');
	});

	test('trimSlashes removes a leading and a trailing slash', () => {
		expect(trimSlashes('/abc/')).toBe('abc');
		expect(trimSlashes('abc')).toBe('abc');
	});
});

describe('isOAuthProtectedWebhookNode', () => {
	test.each([WEBHOOK_NODE_TYPE, WEBPAGE_NODE_TYPE])(
		'should accept an enabled %s node in the n8nOAuth2 mode',
		(type) => {
			expect(isOAuthProtectedWebhookNode(node({ type }))).toBe(true);
		},
	);

	test.each([
		['the authentication is none', node({ parameters: { authentication: 'none' } })],
		['the node is disabled', node({ disabled: true })],
		['the node is another type', node({ type: 'n8n-nodes-base.formTrigger' })],
	])('should reject a node when %s', (_label, candidate) => {
		expect(isOAuthProtectedWebhookNode(candidate)).toBe(false);
	});
});

describe('webhookAllowsBrowserFlow', () => {
	test('should allow the browser flow for a Webpage node only on GET', () => {
		expect(webhookAllowsBrowserFlow(node(), 'GET')).toBe(true);
		expect(webhookAllowsBrowserFlow(node(), 'HEAD')).toBe(false);
		expect(webhookAllowsBrowserFlow(node(), 'POST')).toBe(false);
	});

	test('should ignore the Webhook oauthClient option on a Webpage node', () => {
		const webpage = node({
			parameters: { authentication: 'n8nOAuth2', options: { oauthClient: 'bearer' } },
		});

		expect(webhookAllowsBrowserFlow(webpage, 'GET')).toBe(true);
	});

	test('should keep the version-gated default for a Webhook node', () => {
		expect(
			webhookAllowsBrowserFlow(node({ type: WEBHOOK_NODE_TYPE, typeVersion: 2.1 }), 'GET'),
		).toBe(false);
		expect(
			webhookAllowsBrowserFlow(node({ type: WEBHOOK_NODE_TYPE, typeVersion: 2.2 }), 'GET'),
		).toBe(true);
	});
});

describe('webhookRequiresExecuteAccess', () => {
	test('should always require execute access for a Webpage node', () => {
		expect(webhookRequiresExecuteAccess(node())).toBe(true);
		expect(
			webhookRequiresExecuteAccess(
				node({ parameters: { authentication: 'n8nOAuth2', requireExecuteAccess: false } }),
			),
		).toBe(true);
	});

	test('should let a Webhook node opt out', () => {
		expect(webhookRequiresExecuteAccess(node({ type: WEBHOOK_NODE_TYPE }))).toBe(true);
		expect(
			webhookRequiresExecuteAccess(
				node({
					type: WEBHOOK_NODE_TYPE,
					parameters: { authentication: 'n8nOAuth2', requireExecuteAccess: false },
				}),
			),
		).toBe(false);
	});
});
