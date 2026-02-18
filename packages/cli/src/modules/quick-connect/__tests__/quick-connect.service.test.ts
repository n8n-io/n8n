import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { IQuickConnectHandler } from '../handlers/quick-connect.handler';
import { QuickConnectHandlerRegistry } from '../handlers/quick-connect.handler';
import type { QuickConnectConfig, QuickConnectOption } from '../quick-connect.config';
import { QuickConnectError } from '../quick-connect.errors';
import { QuickConnectService } from '../quick-connect.service';

describe('QuickConnectService', () => {
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const config = mock<QuickConnectConfig>();
	const handlerRegistry = new QuickConnectHandlerRegistry();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new QuickConnectService(
		credentialsService,
		credentialsFinderService,
		config,
		handlerRegistry,
		logger,
	);

	const mockUser = mock<User>({ id: 'user-123' });

	const mockDecryptedCredential = {
		data: {
			apiKey: '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6',
		},
		id: 'cred-123',
		name: 'Test Service (Quick connect)',
		type: 'testCredentialType',
	};

	const createMockOption = (overrides: Partial<QuickConnectOption> = {}): QuickConnectOption =>
		// @ts-expect-error default values overrides for test scenario produce TS error
		({
			packageName: '@n8n/test-package',
			credentialType: 'testCredentialType',
			text: 'Test Quick connect',
			quickConnectType: 'backend',
			serviceName: 'Test Service',
			consentText: 'Allow access?',
			backendFlowConfig: {
				secret: 'test-secret',
			},
			...overrides,
		});

	const createMockHandler = (
		credentialType: string,
		hasGetCredentialData = true,
	): IQuickConnectHandler => {
		const handler: IQuickConnectHandler = {
			credentialType,
		};
		if (hasGetCredentialData) {
			handler.getCredentialData = jest.fn().mockResolvedValue({ token: 'test-token' });
		}
		return handler;
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(
			handlerRegistry as unknown as { handlers: Map<string, IQuickConnectHandler> }
		).handlers.clear();
	});

	describe('createCredential', () => {
		it('should create credential successfully when all conditions are met', async () => {
			const option = createMockOption();
			config.options = [option];
			const handler = createMockHandler('testCredentialType');
			handlerRegistry.register(handler);
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
			credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-123' } as never);
			credentialsService.getOne.mockResolvedValue(mockDecryptedCredential as never);

			const result = await service.createCredential('testCredentialType', mockUser);

			expect(result).toEqual({
				data: {
					apiKey: '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6',
				},
				id: 'cred-123',
				name: 'Test Service (Quick connect)',
				type: 'testCredentialType',
			});
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(handler.getCredentialData).toHaveBeenCalledWith(option, mockUser);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
				{
					name: 'Test Service (Quick connect)',
					type: 'testCredentialType',
					data: { token: 'test-token' },
					projectId: undefined,
				},
				mockUser,
			);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(credentialsService.getOne).toHaveBeenCalledWith(
				mockUser,
				mockDecryptedCredential.id,
				true,
			);
		});

		it('should pass projectId to credential service when provided', async () => {
			const option = createMockOption();
			config.options = [option];
			const handler = createMockHandler('testCredentialType');
			handlerRegistry.register(handler);
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
			credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-123' } as never);
			credentialsService.getOne.mockResolvedValue(mockDecryptedCredential as never);

			await service.createCredential('testCredentialType', mockUser, 'project-456');

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'project-456' }),
				mockUser,
			);
		});

		it('should throw NotFoundError when credential type is not in config options', async () => {
			config.options = [];

			await expect(service.createCredential('unknownType', mockUser)).rejects.toThrow(
				NotFoundError,
			);
			await expect(service.createCredential('unknownType', mockUser)).rejects.toThrow(
				'Quick connect is not available for credential type: unknownType',
			);
		});

		it('should throw ConflictError when credential of same type already exists', async () => {
			const option = createMockOption();
			config.options = [option];
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				{ type: 'testCredentialType' } as never,
			]);

			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				ConflictError,
			);
			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				'A credential of type "testCredentialType" already exists. Quick connect only allows one credential per type.',
			);
		});

		it('should throw BadRequestError when backendFlowConfig.secret is missing', async () => {
			const option = createMockOption({
				backendFlowConfig: undefined,
			});
			config.options = [option];
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				BadRequestError,
			);
			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				'Quick connect is not configured for credential type: testCredentialType',
			);
		});

		it('should throw NotFoundError when handler is not found in registry', async () => {
			const option = createMockOption();
			config.options = [option];
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				NotFoundError,
			);
			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				'Quick connect handler not found for: testCredentialType',
			);
		});

		it('should throw BadRequestError when handler has no getCredentialData method', async () => {
			const option = createMockOption();
			config.options = [option];
			const handler = createMockHandler('testCredentialType', false);
			handlerRegistry.register(handler);

			credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				BadRequestError,
			);
			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				'Quick connect flow for credential type testCredentialType is not backend-based',
			);
		});

		it('should throw QuickConnectError when handler.getCredentialData fails', async () => {
			const option = createMockOption();
			config.options = [option];
			const handler = createMockHandler('testCredentialType');
			(handler.getCredentialData as jest.Mock).mockRejectedValue(new Error('API failed'));
			handlerRegistry.register(handler);
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				QuickConnectError,
			);
			await expect(service.createCredential('testCredentialType', mockUser)).rejects.toThrow(
				'Failed to connect to Test Service. Please try again later.',
			);
		});

		it('should not conflict when existing credentials are of different type', async () => {
			const option = createMockOption();
			config.options = [option];
			const handler = createMockHandler('testCredentialType');
			handlerRegistry.register(handler);
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				{ type: 'differentCredentialType' } as never,
			]);
			credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-123' } as never);
			credentialsService.getOne.mockResolvedValue(mockDecryptedCredential as never);

			const result = await service.createCredential('testCredentialType', mockUser);

			expect(result).toEqual({
				data: {
					apiKey: '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6',
				},
				id: 'cred-123',
				name: 'Test Service (Quick connect)',
				type: 'testCredentialType',
			});
		});
	});
});
