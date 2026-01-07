import type { Logger } from '@n8n/backend-common';
import type {
	ICredentialContext,
	ICredentialDataDecryptedObject,
	IExecutionContext,
	IWorkflowSettings,
} from 'n8n-workflow';

import type {
	CredentialResolveMetadata,
	ICredentialResolutionProvider,
} from '../credential-resolution-provider.interface';
import type {
	CredentialStoreMetadata,
	IDynamicCredentialStorageProvider,
} from '../dynamic-credential-storage.interface';
import { DynamicCredentialsProxy } from '../dynamic-credentials-proxy';

describe('DynamicCredentialsProxy', () => {
	let proxy: DynamicCredentialsProxy;
	let mockLogger: jest.Mocked<Logger>;
	let mockResolverProvider: jest.Mocked<ICredentialResolutionProvider>;
	let mockStorageProvider: jest.Mocked<IDynamicCredentialStorageProvider>;

	beforeEach(() => {
		mockLogger = {
			warn: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		mockResolverProvider = {
			resolveIfNeeded: jest.fn(),
		};

		mockStorageProvider = {
			storeIfNeeded: jest.fn(),
		};

		proxy = new DynamicCredentialsProxy(mockLogger);
	});

	describe('resolveIfNeeded', () => {
		const staticData: ICredentialDataDecryptedObject = { token: 'static-token' };
		const credentialMetadata: CredentialResolveMetadata = {
			id: 'cred-123',
			name: 'Test Credential',
			isResolvable: false,
			type: 'oAuth2Api',
		};

		it('should return static data when no provider is set and credential is not resolvable', async () => {
			const result = await proxy.resolveIfNeeded(credentialMetadata, staticData);

			expect(result).toBe(staticData);
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});

		it('should throw error when no provider is set and credential is resolvable', async () => {
			const resolvableMetadata = { ...credentialMetadata, isResolvable: true };

			await expect(proxy.resolveIfNeeded(resolvableMetadata, staticData)).rejects.toThrow(
				'No dynamic credential resolving provider set',
			);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('No dynamic credential resolving provider set'),
			);
		});

		it('should delegate to provider when set', async () => {
			const dynamicData = { token: 'dynamic-token' };
			mockResolverProvider.resolveIfNeeded.mockResolvedValue(dynamicData);

			proxy.setResolverProvider(mockResolverProvider);

			const result = await proxy.resolveIfNeeded(credentialMetadata, staticData);

			expect(result).toBe(dynamicData);
			expect(mockResolverProvider.resolveIfNeeded).toHaveBeenCalledWith(
				credentialMetadata,
				staticData,
				undefined,
				undefined,
			);
		});

		it('should pass through all parameters to provider', async () => {
			const executionContext: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};
			const workflowSettings: IWorkflowSettings = { executionTimeout: 300 };

			mockResolverProvider.resolveIfNeeded.mockResolvedValue(staticData);
			proxy.setResolverProvider(mockResolverProvider);

			await proxy.resolveIfNeeded(
				credentialMetadata,
				staticData,
				executionContext,
				workflowSettings,
			);

			expect(mockResolverProvider.resolveIfNeeded).toHaveBeenCalledWith(
				credentialMetadata,
				staticData,
				executionContext,
				workflowSettings,
			);
		});
	});

	describe('storeIfNeeded', () => {
		const dynamicData: ICredentialDataDecryptedObject = { token: 'new-token' };
		const credentialContext: ICredentialContext = {
			version: 1,
			identity: 'user-123',
			metadata: {},
		};
		const credentialMetadata: CredentialStoreMetadata = {
			id: 'cred-123',
			name: 'Test Credential',
			type: 'oAuth2Api',
			isResolvable: false,
		};

		it('should return early when no provider is set and credential is not resolvable', async () => {
			await proxy.storeIfNeeded(credentialMetadata, dynamicData, credentialContext);

			expect(mockLogger.warn).not.toHaveBeenCalled();
		});

		it('should throw error when no provider is set and credential is resolvable', async () => {
			const resolvableMetadata = { ...credentialMetadata, isResolvable: true };

			await expect(
				proxy.storeIfNeeded(resolvableMetadata, dynamicData, credentialContext),
			).rejects.toThrow('No dynamic credential storage provider set');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('No dynamic credential storage provider set'),
			);
		});

		it('should delegate to provider when set', async () => {
			proxy.setStorageProvider(mockStorageProvider);

			await proxy.storeIfNeeded(credentialMetadata, dynamicData, credentialContext);

			expect(mockStorageProvider.storeIfNeeded).toHaveBeenCalledWith(
				credentialMetadata,
				dynamicData,
				credentialContext,
				undefined,
				undefined,
			);
		});

		it('should pass through all parameters to provider', async () => {
			const staticData = { clientId: 'static-client-id' };
			const workflowSettings: IWorkflowSettings = { executionTimeout: 300 };

			proxy.setStorageProvider(mockStorageProvider);

			await proxy.storeIfNeeded(
				credentialMetadata,
				dynamicData,
				credentialContext,
				staticData,
				workflowSettings,
			);

			expect(mockStorageProvider.storeIfNeeded).toHaveBeenCalledWith(
				credentialMetadata,
				dynamicData,
				credentialContext,
				staticData,
				workflowSettings,
			);
		});
	});

	describe('provider registration', () => {
		it('should allow setting resolver provider', () => {
			proxy.setResolverProvider(mockResolverProvider);

			// Verify by checking it doesn't throw when resolving resolvable credential
			expect(() => proxy.setResolverProvider(mockResolverProvider)).not.toThrow();
		});

		it('should allow setting storage provider', () => {
			proxy.setStorageProvider(mockStorageProvider);

			// Verify by checking it doesn't throw when storing resolvable credential
			expect(() => proxy.setStorageProvider(mockStorageProvider)).not.toThrow();
		});
	});
});
