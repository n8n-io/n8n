import FormData from 'form-data';
import type { Agent } from 'https';
import { mock } from 'jest-mock-extended';
import type { IHttpRequestMethods, IRequestOptions } from 'n8n-workflow';
import type { SecureContextOptions } from 'tls';

import { parseRequestObject } from '../parse-request-object';

describe('parseRequestObject', () => {
	test('should handle basic request options', async () => {
		const axiosOptions = await parseRequestObject({
			url: 'https://example.com',
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: { key: 'value' },
		});

		expect(axiosOptions).toEqual(
			expect.objectContaining({
				url: 'https://example.com',
				method: 'POST',
				headers: { accept: '*/*', 'content-type': 'application/json' },
				data: { key: 'value' },
				maxRedirects: 0,
			}),
		);
	});

	test('should set correct headers for FormData', async () => {
		const formData = new FormData();
		formData.append('key', 'value');

		const axiosOptions = await parseRequestObject({
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

	test('should not use Host header for SNI', async () => {
		const axiosOptions = await parseRequestObject({
			url: 'https://example.de/foo/bar',
			headers: { Host: 'other.host.com' },
		});
		expect((axiosOptions.httpsAgent as Agent).options.servername).toEqual('example.de');
	});

	describe('should set SSL certificates', () => {
		const agentOptions: SecureContextOptions = {
			ca: '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----',
		};
		const requestObject: IRequestOptions = {
			method: 'GET',
			uri: 'https://example.de',
			agentOptions,
		};

		test('on regular requests', async () => {
			const axiosOptions = await parseRequestObject(requestObject);
			expect((axiosOptions.httpsAgent as Agent).options).toEqual({
				servername: 'example.de',
				...agentOptions,
				noDelay: true,
				path: null,
			});
		});

		test('on redirected requests', async () => {
			const axiosOptions = await parseRequestObject(requestObject);
			expect(axiosOptions.beforeRedirect).toBeDefined;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const redirectOptions: Record<string, any> = { agents: {}, hostname: 'example.de' };
			axiosOptions.beforeRedirect!(redirectOptions, mock());
			expect(redirectOptions.agent).toEqual(redirectOptions.agents.https);
			expect((redirectOptions.agent as Agent).options).toEqual({
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
				const axiosOptions = await parseRequestObject({
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
				const axiosOptions = await parseRequestObject({
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
				const axiosOptions = await parseRequestObject({
					method,
					followAllRedirects: true,
					maxRedirects: 1234,
				});
				expect(axiosOptions.maxRedirects).toEqual(1234);
			},
		);
	});
});
