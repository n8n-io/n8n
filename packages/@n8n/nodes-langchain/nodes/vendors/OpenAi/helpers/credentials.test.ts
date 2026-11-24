import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { assertOpenAiCredentialAllowsUrl } from './credentials';

describe('assertOpenAiCredentialAllowsUrl', () => {
	const node = {
		id: '1',
		name: 'Test Node',
		type: 'test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as INode;

	it('should return undefined when the credential has no restriction mode', () => {
		const result = assertOpenAiCredentialAllowsUrl(node, { apiKey: 'key' }, 'https://any.host/v1');

		expect(result).toBeUndefined();
	});

	it('should allow the credential URL in "none" mode', () => {
		const credentials = {
			apiKey: 'key',
			url: 'https://api.openai.com/v1',
			allowedHttpRequestDomains: 'none',
		};

		expect(() =>
			assertOpenAiCredentialAllowsUrl(node, credentials, 'https://api.openai.com/v1'),
		).not.toThrow();
	});

	it('should reject other URLs in "none" mode when the credential has a URL', () => {
		const credentials = {
			apiKey: 'key',
			url: 'https://api.openai.com/v1',
			allowedHttpRequestDomains: 'none',
		};

		expect(() =>
			assertOpenAiCredentialAllowsUrl(node, credentials, 'https://other.host/v1'),
		).toThrow(NodeOperationError);
	});

	it.each([undefined, '', null])(
		'should fall back to the default URL in "none" mode when the credential URL is %p',
		(url) => {
			const credentials = {
				apiKey: 'key',
				url,
				allowedHttpRequestDomains: 'none',
			} as unknown as ICredentialDataDecryptedObject;

			expect(() =>
				assertOpenAiCredentialAllowsUrl(node, credentials, 'https://api.openai.com/v1'),
			).not.toThrow();
			expect(() =>
				assertOpenAiCredentialAllowsUrl(node, credentials, 'https://any.host/v1'),
			).toThrow(NodeOperationError);
		},
	);

	it('should allow a listed domain in "domains" mode and return the list', () => {
		const credentials = {
			apiKey: 'key',
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'example.com, *.example.org',
		};

		const result = assertOpenAiCredentialAllowsUrl(node, credentials, 'https://example.com/v1');

		expect(result).toBe('example.com, *.example.org');
	});

	it('should reject an unlisted domain in "domains" mode', () => {
		const credentials = {
			apiKey: 'key',
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'example.com',
		};

		expect(() =>
			assertOpenAiCredentialAllowsUrl(node, credentials, 'https://other.host/v1'),
		).toThrow(NodeOperationError);
	});

	it('should throw in "domains" mode when no domains are listed', () => {
		const credentials = { apiKey: 'key', allowedHttpRequestDomains: 'domains' };

		expect(() =>
			assertOpenAiCredentialAllowsUrl(node, credentials, 'https://example.com/v1'),
		).toThrow(NodeOperationError);
	});
});
