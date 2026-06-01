import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import nock from 'nock';

import type { FirecrawlQuickConnect } from '../../quick-connect.config';
import { FirecrawlHandler } from '../firecrawl.handler';

describe('FirecrawlHandler', () => {
	let handler: FirecrawlHandler;
	const FIRECRAWL_API_BASE_URL = 'https://api.firecrawl.dev';

	beforeEach(() => {
		handler = new FirecrawlHandler();
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('setConfig', () => {
		it('should set configuration', () => {
			const config: FirecrawlQuickConnect = {
				packageName: '@n8n/firecrawl',
				credentialType: 'firecrawlApi',
				text: 'Firecrawl Integration',
				quickConnectType: 'firecrawl',
				consentText: 'Allow access?',
				backendFlowConfig: {
					secret: 'test-secret',
				},
			};

			handler.setConfig(config);

			expect(handler['config']).toEqual(config);
		});
	});

	describe('getCredentialData', () => {
		const mockConfig: FirecrawlQuickConnect = {
			packageName: '@n8n/firecrawl',
			credentialType: 'firecrawlApi',
			text: 'Firecrawl Integration',
			quickConnectType: 'firecrawl',
			consentText: 'Allow access?',
			backendFlowConfig: {
				secret: 'test-secret-key',
			},
		};

		beforeEach(() => {
			handler.setConfig(mockConfig);
		});

		it('should successfully fetch API key with correct request', async () => {
			const user = mock<User>({ email: 'test@example.com' });
			const expectedApiKey = 'fc-api-key-123456';

			const scope = nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user', { email: 'test@example.com' })
				.matchHeader('Authorization', 'Bearer test-secret-key')
				.matchHeader('Content-Type', 'application/json')
				.reply(200, { apiKey: expectedApiKey });

			const result = await handler.getCredentialData(user);

			expect(result).toEqual({ apiKey: expectedApiKey });
			expect(scope.isDone()).toBe(true);
		});

		it('should send user email in request body', async () => {
			const user = mock<User>({ email: 'specific@example.com' });

			const scope = nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user', { email: 'specific@example.com' })
				.reply(200, { apiKey: 'test-key' });

			await handler.getCredentialData(user);

			expect(scope.isDone()).toBe(true);
		});

		it('should throw on 400 error response', async () => {
			const user = mock<User>({ email: 'test@example.com' });

			nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user')
				.reply(400, { error: 'Bad Request' });

			await expect(handler.getCredentialData(user)).rejects.toThrow();
		});

		it('should handle network errors', async () => {
			const user = mock<User>({ email: 'test@example.com' });

			nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user')
				.replyWithError('Network error');

			await expect(handler.getCredentialData(user)).rejects.toThrow();
		});

		it('should return undefined apiKey for invalid JSON response', async () => {
			const user = mock<User>({ email: 'test@example.com' });

			nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user')
				// eslint-disable-next-line @typescript-eslint/naming-convention
				.reply(200, 'invalid json', { 'Content-Type': 'application/json' });

			const result = await handler.getCredentialData(user);
			expect(result.apiKey).toBeUndefined();
		});

		it('should handle response with missing apiKey', async () => {
			const user = mock<User>({ email: 'test@example.com' });

			nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user')
				.reply(200, { data: 'something else' });

			const result = await handler.getCredentialData(user);

			// Should still return the response, apiKey will be undefined
			expect(result.apiKey).toBeUndefined();
		});

		it('should throw on 500 error response', async () => {
			const user = mock<User>({ email: 'test@example.com' });

			nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user')
				.reply(500, { error: 'Internal Server Error' });

			await expect(handler.getCredentialData(user)).rejects.toThrow();
		});
	});

	describe('error handling', () => {
		it('should throw when config is missing', async () => {
			const user = mock<User>({ email: 'test@example.com' });

			const scope = nock(FIRECRAWL_API_BASE_URL)
				.post('/admin/integration/create-user', { email: 'specific@example.com' })
				.reply(200, { apiKey: 'test-key' });

			await expect(handler.getCredentialData(user)).rejects.toThrow();
			expect(scope.isDone()).toBe(false);
		});
	});
});
