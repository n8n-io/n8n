import FormData from 'form-data';
import type { Agent as HttpsAgent } from 'https';
import type { IHttpRequestMethods, IRequestOptions } from 'n8n-workflow';
import nock from 'nock';
import type { SecureContextOptions } from 'tls';
import { mock } from 'vitest-mock-extended';

import { buildAxiosConfigFromLegacyRequest } from '../legacy';

const TEST_CA_CERT = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----';

describe('buildAxiosConfigFromLegacyRequest', () => {
	test('should handle basic request options', async () => {
		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.com',
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: { key: 'value' },
		});

		expect(axiosOptions).toEqual(
			expect.objectContaining({
				url: 'https://example.com',
				method: 'POST',
				headers: {
					accept: '*/*',
					'content-type': 'application/json',
					'User-Agent': 'n8n',
				},
				data: { key: 'value' },
				maxRedirects: 0,
			}),
		);
	});

	test('should set default User-Agent when none provided', async () => {
		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.com',
			method: 'GET',
		});

		expect(axiosOptions.headers).toMatchObject({ 'User-Agent': 'n8n' });
	});

	test('should preserve a caller-supplied User-Agent header', async () => {
		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.com',
			method: 'GET',
			headers: { 'User-Agent': 'MyCustomNode/1.0' },
		});

		expect(axiosOptions.headers).toMatchObject({ 'User-Agent': 'MyCustomNode/1.0' });
		expect(axiosOptions.headers).not.toMatchObject({ 'User-Agent': 'n8n' });
	});

	test('should set correct headers for FormData', async () => {
		const formData = new FormData();
		formData.append('key', 'value');

		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.com',
			formData,
			headers: {
				'content-type': 'multipart/form-data',
			},
		});

		expect(axiosOptions.headers).toMatchObject({
			accept: '*/*',
			'content-length': 163,
			'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
		});

		expect(axiosOptions.data).toBeInstanceOf(FormData);
	});

	test('should handle FormData from a different module copy (duck-typing)', async () => {
		// Simulate a FormData created by a different copy of the form-data package.
		// instanceof FormData would return false, but duck-type check should pass.
		const realFormData = new FormData();
		realFormData.append('key', 'value');

		// Create a wrapper that breaks instanceof but preserves the interface
		const foreignFormData: Record<string, unknown> = Object.create(null);
		for (const prop of Object.getOwnPropertyNames(Object.getPrototypeOf(realFormData))) {
			const value = (realFormData as unknown as Record<string, unknown>)[prop];
			if (typeof value === 'function') {
				foreignFormData[prop] = value.bind(realFormData);
			}
		}
		for (const prop of Object.getOwnPropertyNames(realFormData)) {
			foreignFormData[prop] = (realFormData as unknown as Record<string, unknown>)[prop];
		}

		// Verify it's NOT an instanceof FormData
		expect(foreignFormData instanceof FormData).toBe(false);

		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.com',
			formData: foreignFormData as unknown as FormData,
			headers: {
				'content-type': 'multipart/form-data',
			},
		});

		expect(axiosOptions.headers).toMatchObject({
			'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
		});
	});

	test('should forward a string form body unchanged', async () => {
		const form = 'user=john%20doe&token=a%2Bb';

		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.com',
			method: 'POST',
			// The legacy `request` library accepted pre-encoded string form bodies,
			// even though the type only models object/FormData forms.
			form: form as unknown as IRequestOptions['form'],
		});

		expect(axiosOptions.data).toBe(form);
		expect(axiosOptions.headers).toMatchObject({
			'Content-Type': 'application/x-www-form-urlencoded',
		});
	});

	test('should serialize an object form body as x-www-form-urlencoded', async () => {
		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.com',
			method: 'POST',
			form: { foo: 'bar', baz: 'qux' },
		});

		expect(axiosOptions.data).toBe('foo=bar&baz=qux');
		expect(axiosOptions.headers).toMatchObject({
			'Content-Type': 'application/x-www-form-urlencoded',
		});
	});

	test('should not use Host header for SNI', async () => {
		const axiosOptions = await buildAxiosConfigFromLegacyRequest({
			url: 'https://example.de/foo/bar',
			headers: { Host: 'other.host.com' },
		});
		expect((axiosOptions.httpsAgent as HttpsAgent).options.servername).toEqual('example.de');
	});

	describe('should set SSL certificates', () => {
		const agentOptions: SecureContextOptions = {
			ca: TEST_CA_CERT,
		};
		const requestObject: IRequestOptions = {
			method: 'GET',
			uri: 'https://example.de',
			agentOptions,
		};

		test('on regular requests', async () => {
			const axiosOptions = await buildAxiosConfigFromLegacyRequest(requestObject);
			expect((axiosOptions.httpsAgent as HttpsAgent).options).toMatchObject({
				servername: 'example.de',
				...agentOptions,
				noDelay: true,
				path: null,
			});
		});

		test('on redirected requests', async () => {
			const axiosOptions = await buildAxiosConfigFromLegacyRequest(requestObject);
			expect(axiosOptions.beforeRedirect).toBeDefined();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const redirectOptions: Record<string, any> = {
				agents: {},
				hostname: 'example.de',
				href: requestObject.uri,
			};
			axiosOptions.beforeRedirect!(redirectOptions, mock(), mock());
			expect(redirectOptions.agent).toEqual(redirectOptions.agents.https);
			expect((redirectOptions.agent as HttpsAgent).options).toMatchObject({
				servername: 'example.de',
				...agentOptions,
				noDelay: true,
				path: null,
			});
		});
	});

	describe('when followRedirect is true', () => {
		test.each(['GET', 'HEAD'] as IHttpRequestMethods[])(
			'should set maxRedirects on %s ',
			async (method) => {
				const axiosOptions = await buildAxiosConfigFromLegacyRequest({
					method,
					followRedirect: true,
					maxRedirects: 1234,
				});
				expect(axiosOptions.maxRedirects).toEqual(1234);
			},
		);

		test.each(['POST', 'PUT', 'PATCH', 'DELETE'] as IHttpRequestMethods[])(
			'should not set maxRedirects on %s ',
			async (method) => {
				const axiosOptions = await buildAxiosConfigFromLegacyRequest({
					method,
					followRedirect: true,
					maxRedirects: 1234,
				});
				expect(axiosOptions.maxRedirects).toEqual(0);
			},
		);
	});

	describe('when followAllRedirects is true', () => {
		test.each(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as IHttpRequestMethods[])(
			'should set maxRedirects on %s ',
			async (method) => {
				const axiosOptions = await buildAxiosConfigFromLegacyRequest({
					method,
					followAllRedirects: true,
					maxRedirects: 1234,
				});
				expect(axiosOptions.maxRedirects).toEqual(1234);
			},
		);
	});

	describe('domain allowlist enforcement', () => {
		const baseUrl = 'https://example.com';

		beforeEach(() => {
			nock.cleanAll();
		});

		test('should pass allowedDomains to beforeRedirect', async () => {
			const axiosOptions = await buildAxiosConfigFromLegacyRequest({
				url: `${baseUrl}/test`,
				allowedDomains: 'example.com',
			});
			const redirectOptions = {
				agents: {},
				hostname: 'not-allowed.com',
				href: 'https://not-allowed.com/data',
			};

			expect(axiosOptions.beforeRedirect).toBeDefined();
			expect(() => axiosOptions.beforeRedirect!(redirectOptions, mock(), mock())).toThrow(
				'Domain not allowed',
			);
		});

		test.each([['example.com'], [undefined]])(
			'should not block redirects when allowedDomains is %s',
			async (allowedDomains) => {
				const axiosOptions = await buildAxiosConfigFromLegacyRequest({
					url: `${baseUrl}/test`,
					allowedDomains,
				});
				const redirectOptions = {
					agents: {},
					hostname: 'example.com',
					href: 'https://example.com/data',
				};

				expect(axiosOptions.beforeRedirect).toBeDefined();
				expect(() => axiosOptions.beforeRedirect!(redirectOptions, mock(), mock())).not.toThrow();
			},
		);
	});
});
