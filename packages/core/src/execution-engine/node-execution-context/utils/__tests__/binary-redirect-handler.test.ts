import type { AxiosRequestConfig } from 'axios';
import nock from 'nock';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import {
	resolveRedirectsForBinary,
	createBinarySafeConfig,
	executeBinarySafeRequest,
} from '../binary-redirect-handler';

describe('Binary Redirect Handler', () => {
	const baseUrl = 'https://api.example.com';
	const cdnUrl = 'https://cdn.example.net';

	beforeEach(() => {
		nock.cleanAll();
		jest.clearAllMocks();
		
		// Mock logger
		const mockLogger = {
			debug: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			info: jest.fn(),
		};
		Container.set(Logger, mockLogger as unknown as Logger);
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('resolveRedirectsForBinary', () => {
		it('should resolve a single redirect to a different origin', async () => {
			// Mock the redirect
			nock(baseUrl)
				.head('/file/123')
				.reply(302, '', { Location: `${cdnUrl}/content/abc.jpg` });

			nock(cdnUrl).head('/content/abc.jpg').reply(200);

			const config: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				method: 'GET',
			};

			const result = await resolveRedirectsForBinary(config);

			expect(result.crossOriginRedirect).toBe(true);
			expect(result.originalOrigin).toBe(baseUrl);
			expect(result.finalOrigin).toBe(cdnUrl);
			expect(result.finalUrl).toContain(cdnUrl);
		});

		it('should handle same-origin redirects', async () => {
			nock(baseUrl)
				.head('/file/123')
				.reply(302, '', { Location: `${baseUrl}/content/abc.jpg` });

			nock(baseUrl).head('/content/abc.jpg').reply(200);

			const config: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				method: 'GET',
			};

			const result = await resolveRedirectsForBinary(config);

			expect(result.crossOriginRedirect).toBe(false);
			expect(result.originalOrigin).toBe(baseUrl);
			expect(result.finalOrigin).toBe(baseUrl);
		});

		it('should handle multiple redirects', async () => {
			const intermediateUrl = 'https://redirect.example.org';

			nock(baseUrl)
				.head('/file/123')
				.reply(302, '', { Location: `${intermediateUrl}/temp` });

			nock(intermediateUrl)
				.head('/temp')
				.reply(307, '', { Location: `${cdnUrl}/content/abc.jpg` });

			nock(cdnUrl).head('/content/abc.jpg').reply(200);

			const config: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				method: 'GET',
			};

			const result = await resolveRedirectsForBinary(config);

			expect(result.crossOriginRedirect).toBe(true);
			expect(result.finalOrigin).toBe(cdnUrl);
		});

		it('should return original URL if HEAD request fails', async () => {
			nock(baseUrl).head('/file/123').reply(405); // Method Not Allowed

			const config: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				method: 'GET',
			};

			const result = await resolveRedirectsForBinary(config);

			expect(result.finalUrl).toBe(`${baseUrl}/file/123`);
			expect(result.crossOriginRedirect).toBe(false);
		});
	});

	describe('createBinarySafeConfig', () => {
		it('should remove Authorization header for cross-origin redirects', () => {
			const originalConfig: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				headers: {
					Authorization: 'Bearer secret-token',
					'Content-Type': 'application/json',
				},
			};

			const redirectInfo = {
				finalUrl: `${cdnUrl}/content/abc.jpg`,
				crossOriginRedirect: true,
				originalOrigin: baseUrl,
				finalOrigin: cdnUrl,
			};

			const finalConfig = createBinarySafeConfig(originalConfig, redirectInfo);

			expect(finalConfig.headers?.Authorization).toBeUndefined();
			expect(finalConfig.headers?.['Content-Type']).toBe('application/json');
			expect(finalConfig.url).toBe(`${cdnUrl}/content/abc.jpg`);
			expect(finalConfig.maxRedirects).toBe(0);
		});

		it('should keep Authorization header for same-origin redirects', () => {
			const originalConfig: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				headers: {
					Authorization: 'Bearer secret-token',
				},
			};

			const redirectInfo = {
				finalUrl: `${baseUrl}/content/abc.jpg`,
				crossOriginRedirect: false,
				originalOrigin: baseUrl,
				finalOrigin: baseUrl,
			};

			const finalConfig = createBinarySafeConfig(originalConfig, redirectInfo);

			expect(finalConfig.headers?.Authorization).toBe('Bearer secret-token');
		});

		it('should create fresh HTTP agents', () => {
			const originalConfig: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
			};

			const redirectInfo = {
				finalUrl: `${cdnUrl}/content/abc.jpg`,
				crossOriginRedirect: true,
				originalOrigin: baseUrl,
				finalOrigin: cdnUrl,
			};

			const finalConfig = createBinarySafeConfig(originalConfig, redirectInfo);

			expect(finalConfig.httpAgent).toBeDefined();
			expect(finalConfig.httpsAgent).toBeDefined();
		});
	});

	describe('executeBinarySafeRequest', () => {
		it('should successfully download binary content after resolving redirects', async () => {
			const binaryData = Buffer.from('fake-image-data');

			// Mock redirect
			nock(baseUrl)
				.head('/file/123')
				.reply(302, '', { Location: `${cdnUrl}/content/abc.jpg` });

			nock(cdnUrl).head('/content/abc.jpg').reply(200);

			// Mock actual binary download
			nock(cdnUrl).get('/content/abc.jpg').reply(200, binaryData, {
				'Content-Type': 'image/jpeg',
			});

			const config: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				method: 'GET',
				responseType: 'arraybuffer',
			};

			const response = await executeBinarySafeRequest(config);

			expect(response.status).toBe(200);
			expect(Buffer.from(response.data)).toEqual(binaryData);
		});

		it('should NOT send Authorization header to CDN after cross-origin redirect', async () => {
			const binaryData = Buffer.from('fake-image-data');

			// Mock redirect
			nock(baseUrl)
				.head('/file/123')
				.matchHeader('Authorization', 'Bearer secret-token')
				.reply(302, '', { Location: `${cdnUrl}/content/abc.jpg` });

			nock(cdnUrl).head('/content/abc.jpg').reply(200);

			// Mock actual binary download - should NOT have Authorization header
			nock(cdnUrl)
				.get('/content/abc.jpg')
				.matchHeader('Authorization', (val) => val === undefined)
				.reply(200, binaryData);

			const config: AxiosRequestConfig = {
				url: `${baseUrl}/file/123`,
				method: 'GET',
				responseType: 'arraybuffer',
				headers: {
					Authorization: 'Bearer secret-token',
				},
			};

			const response = await executeBinarySafeRequest(config);

			expect(response.status).toBe(200);
		});

		it('should handle 307 temporary redirects correctly', async () => {
			const binaryData = Buffer.from('fake-pdf-data');

			nock(baseUrl)
				.head('/document/456')
				.reply(307, '', { Location: `${cdnUrl}/docs/report.pdf` });

			nock(cdnUrl).head('/docs/report.pdf').reply(200);

			nock(cdnUrl).get('/docs/report.pdf').reply(200, binaryData, {
				'Content-Type': 'application/pdf',
			});

			const config: AxiosRequestConfig = {
				url: `${baseUrl}/document/456`,
				method: 'GET',
				responseType: 'arraybuffer',
			};

			const response = await executeBinarySafeRequest(config);

			expect(response.status).toBe(200);
			expect(response.headers['content-type']).toBe('application/pdf');
		});
	});

	describe('Integration: LINE API scenario', () => {
		it('should handle LINE Messaging API binary content download', async () => {
			// Simulate LINE API behavior:
			// 1. Initial request to api-data.line.me with Authorization
			// 2. Redirects to obs.line-scdn.net (CDN) without Authorization
			// 3. CDN returns binary image data

			const lineApiUrl = 'https://api-data.line.me';
			const lineCdnUrl = 'https://obs.line-scdn.net';
			const imageData = Buffer.from('fake-line-image-data');

			// HEAD request follows redirect
			nock(lineApiUrl)
				.head('/v2/bot/message/123456/content')
				.matchHeader('Authorization', 'Bearer line-channel-token')
				.reply(302, '', { Location: `${lineCdnUrl}/abcdef/image.jpg` });

			nock(lineCdnUrl).head('/abcdef/image.jpg').reply(200);

			// Actual GET request to CDN should NOT have Authorization
			nock(lineCdnUrl)
				.get('/abcdef/image.jpg')
				.matchHeader('Authorization', (val) => val === undefined)
				.reply(200, imageData, {
					'Content-Type': 'image/jpeg',
				});

			const config: AxiosRequestConfig = {
				url: `${lineApiUrl}/v2/bot/message/123456/content`,
				method: 'GET',
				responseType: 'arraybuffer',
				headers: {
					Authorization: 'Bearer line-channel-token',
				},
			};

			const response = await executeBinarySafeRequest(config);

			expect(response.status).toBe(200);
			expect(Buffer.from(response.data)).toEqual(imageData);
			expect(response.headers['content-type']).toBe('image/jpeg');
		});
	});
});
