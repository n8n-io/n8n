import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { IQuickConnectHandler } from '../handlers/handler.interface';
import { QuickConnectConfig } from '../quick-connect.config';
import { QuickConnectError } from '../quick-connect.errors';
import { QuickConnectService } from '../quick-connect.service';

describe('QuickConnectService', () => {
	let service: QuickConnectService;
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnThis(),
		error: jest.fn(),
	});
	let config: QuickConnectConfig;

	beforeEach(() => {
		Container.reset();
		config = new QuickConnectConfig();
		service = new QuickConnectService(logger, config);
	});

	describe('getCredentialData', () => {
		it('should return API key when handler is configured', async () => {
			const user = mock<User>({ email: 'test@example.com' });
			const mockHandler = mock<IQuickConnectHandler>();
			const expectedResult = { apiKey: 'test-api-key-123' };
			mockHandler.getCredentialData.mockResolvedValue(expectedResult);

			// Manually set handler
			service['handlers'].set('firecrawl', mockHandler);

			const result = await service.getCredentialData('firecrawl', user);

			expect(result).toEqual(expectedResult);
			expect(mockHandler.getCredentialData).toHaveBeenCalledWith(user);
		});

		it('should throw BadRequestError when handler is not configured', async () => {
			const user = mock<User>({ email: 'test@example.com' });

			await expect(service.getCredentialData('nonexistent', user)).rejects.toThrow(BadRequestError);
			await expect(service.getCredentialData('nonexistent', user)).rejects.toThrow(
				'Quick connect handler not configured for: nonexistent',
			);
		});

		it('should wrap handler errors in QuickConnectError', async () => {
			const user = mock<User>({ email: 'test@example.com' });
			const mockHandler = mock<IQuickConnectHandler>();
			const handlerError = new Error('Network failure');
			mockHandler.getCredentialData.mockRejectedValue(handlerError);

			service['handlers'].set('firecrawl', mockHandler);

			await expect(service.getCredentialData('firecrawl', user)).rejects.toThrow(QuickConnectError);
			await expect(service.getCredentialData('firecrawl', user)).rejects.toThrow(
				'Failed to connect to external service. Please try again later.',
			);

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to fetch credential data from third-party',
				{
					error: handlerError,
					quickConnectType: 'firecrawl',
				},
			);
		});

		it('should wrap non-Error objects in QuickConnectError', async () => {
			const user = mock<User>({ email: 'test@example.com' });
			const mockHandler = mock<IQuickConnectHandler>();
			mockHandler.getCredentialData.mockRejectedValue('string error');

			service['handlers'].set('firecrawl', mockHandler);

			await expect(service.getCredentialData('firecrawl', user)).rejects.toThrow(QuickConnectError);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to fetch credential data from third-party',
				{
					error: 'string error',
					quickConnectType: 'firecrawl',
				},
			);
		});
	});

	describe('registerHandlers', () => {
		it('should register firecrawl handler when configured', async () => {
			const testConfig = [
				{
					packageName: '@n8n/firecrawl',
					credentialType: 'firecrawlApi',
					text: 'Firecrawl Integration',
					quickConnectType: 'firecrawl',
					serviceName: 'Firecrawl',
					consentText: 'Allow access?',
					backendFlowConfig: {
						secret: 'test-secret',
					},
				},
			];
			process.env.N8N_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			// Reinitialize config to pick up env variable
			config = Container.get(QuickConnectConfig);
			service = new QuickConnectService(logger, config);

			await service.registerHandlers();

			const hasHandler = service['handlers'].has('firecrawl');
			expect(hasHandler).toBe(true);
		});

		it('should not register handlers for non-backend quickConnectTypes', async () => {
			const testConfig = [
				{
					packageName: '@n8n/oauth-service',
					credentialType: 'oauthApi',
					text: 'OAuth Service',
					quickConnectType: 'oauth',
					serviceName: 'OAuth Service',
				},
			];
			process.env.N8N_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			config = Container.get(QuickConnectConfig);
			service = new QuickConnectService(logger, config);

			await service.registerHandlers();

			const hasHandler = service['handlers'].has('oauth');
			expect(hasHandler).toBe(false);
		});

		it('should handle empty config', async () => {
			process.env.N8N_QUICK_CONNECT_OPTIONS = '[]';

			config = Container.get(QuickConnectConfig);
			service = new QuickConnectService(logger, config);

			await service.registerHandlers();

			expect(service['handlers'].size).toBe(0);
		});

		it('should register multiple backend handlers', async () => {
			const testConfig = [
				{
					packageName: '@n8n/firecrawl',
					credentialType: 'firecrawlApi',
					text: 'Firecrawl Integration',
					quickConnectType: 'firecrawl',
					serviceName: 'Firecrawl',
					consentText: 'Allow access?',
					backendFlowConfig: {
						secret: 'test-secret-1',
					},
				},
			];
			process.env.N8N_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			config = Container.get(QuickConnectConfig);
			service = new QuickConnectService(logger, config);

			await service.registerHandlers();

			expect(service['handlers'].size).toBeGreaterThan(0);
		});
	});

	afterEach(() => {
		delete process.env.N8N_QUICK_CONNECT_OPTIONS;
	});
});
