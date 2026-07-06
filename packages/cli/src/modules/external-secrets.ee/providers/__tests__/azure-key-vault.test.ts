import { AuthenticationError } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import type { KeyVaultSecret } from '@azure/keyvault-secrets';
import type { Logger } from '@n8n/backend-common';
import { UnexpectedError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AzureKeyVault } from '../azure-key-vault/azure-key-vault';
import type { AzureKeyVaultContext } from '../azure-key-vault/types';

vi.mock('@azure/identity');
vi.mock('@azure/keyvault-secrets');

function createRestErrorLike(
	message: string,
	{ statusCode, code }: { statusCode?: number; code?: string },
): Error {
	return Object.assign(new Error(message), {
		name: 'RestError',
		statusCode,
		code,
	});
}

describe('AzureKeyVault', () => {
	const logger = mock<Logger>();
	let azureKeyVault: AzureKeyVault;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		azureKeyVault = new AzureKeyVault(logger);
	});

	describe('error context', () => {
		it('extracts statusCode and errorCode from RestError-like errors', () => {
			const error = createRestErrorLike('Permission denied', {
				statusCode: 403,
				code: 'Forbidden',
			});

			expect(azureKeyVault['azureErrorContext'](error)).toEqual({
				statusCode: 403,
				errorCode: 'Forbidden',
			});
		});

		it('extracts errorCode from RestError-like errors without statusCode', () => {
			const error = createRestErrorLike('Connection failed', {
				code: 'REQUEST_SEND_ERROR',
			});

			expect(azureKeyVault['azureErrorContext'](error)).toEqual({
				errorCode: 'REQUEST_SEND_ERROR',
			});
		});

		it('extracts statusCode and errorCode from AuthenticationError', () => {
			const error = Object.assign(
				new AuthenticationError(401, {
					error: 'invalid_client',
					error_description: 'Invalid client secret',
				}),
				{
					statusCode: 401,
					errorResponse: { error: 'invalid_client' },
				},
			);

			expect(azureKeyVault['azureErrorContext'](error)).toEqual({
				statusCode: 401,
				errorCode: 'invalid_client',
			});
		});

		it('falls back to Error.name for generic errors', () => {
			expect(azureKeyVault['azureErrorContext'](new Error('Something went wrong'))).toEqual({
				errorCode: 'Error',
			});
		});

		it('returns empty context for non-error values', () => {
			expect(azureKeyVault['azureErrorContext']('not an error')).toEqual({});
			expect(azureKeyVault['azureErrorContext'](null)).toEqual({});
		});
	});

	it('should log failed client setup while preserving error state', async () => {
		await azureKeyVault.init(
			mock<AzureKeyVaultContext>({
				settings: {
					vaultName: 'my-vault',
					tenantId: 'my-tenant-id',
					clientId: 'my-client-id',
					clientSecret: 'my-client-secret',
				},
			}),
		);

		const setupError = new Error('Invalid configuration');
		const SecretClientMock = SecretClient as unknown as Mock;
		SecretClientMock.mockImplementationOnce(() => {
			throw setupError;
		});

		await azureKeyVault.connect();

		expect(azureKeyVault.state).toBe('error');
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to connect Azure Key Vault provider',
			expect.objectContaining({
				providerName: 'azureKeyVault',
				providerDisplayName: 'Azure Key Vault',
				operation: 'connect',
				vaultName: 'my-vault',
				errorName: expect.any(String),
				errorCode: expect.any(String),
			}),
		);
	});

	it('should log test failures with Azure error context', async () => {
		await azureKeyVault.init(
			mock<AzureKeyVaultContext>({
				settings: {
					vaultName: 'my-vault',
					tenantId: 'my-tenant-id',
					clientId: 'my-client-id',
					clientSecret: 'my-client-secret',
				},
			}),
		);

		await azureKeyVault.connect();

		const restError = Object.assign(new Error('Permission denied'), {
			name: 'RestError',
			statusCode: 403,
			code: 'Forbidden',
		});

		vi.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets').mockReturnValue({
			next: vi.fn().mockRejectedValue(restError),
		} as never);

		const [success, message] = await azureKeyVault.test();

		expect(success).toBe(false);
		expect(message).toBe('Permission denied');
		expect(logger.warn).toHaveBeenCalledWith(
			'Azure Key Vault provider test failed',
			expect.objectContaining({
				providerName: 'azureKeyVault',
				operation: 'test',
				errorName: 'RestError',
				statusCode: 403,
				errorCode: 'Forbidden',
				vaultName: 'my-vault',
			}),
		);
	});

	it('should update cached secrets', async () => {
		/**
		 * Arrange
		 */
		await azureKeyVault.init(
			mock<AzureKeyVaultContext>({
				settings: {
					vaultName: 'my-vault',
					tenantId: 'my-tenant-id',
					clientId: 'my-client-id',
					clientSecret: 'my-client-secret',
				},
			}),
		);

		const listSpy = vi.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets').mockImplementation(
			() =>
				({
					async *[Symbol.asyncIterator]() {
						yield { name: 'secret1' };
						yield { name: 'secret2' };
						yield { name: 'secret3' }; // no value
					},
				}) as never,
		);

		const getSpy = vi
			.spyOn(SecretClient.prototype, 'getSecret')
			.mockImplementation(async (name: string) => {
				return mock<KeyVaultSecret>({ value: { secret1: 'value1', secret2: 'value2' }[name] });
			});

		/**
		 * Act
		 */
		await azureKeyVault.connect();
		await azureKeyVault.update();

		/**
		 * Assert
		 */
		expect(listSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalledWith('secret1');
		expect(getSpy).toHaveBeenCalledWith('secret2');
		expect(getSpy).toHaveBeenCalledWith('secret3');

		expect(azureKeyVault.getSecret('secret1')).toBe('value1');
		expect(azureKeyVault.getSecret('secret2')).toBe('value2');
		expect(azureKeyVault.getSecret('secret3')).toBeUndefined(); // no value
	});

	it('should skip disabled secrets without calling getSecret', async () => {
		await azureKeyVault.init(
			mock<AzureKeyVaultContext>({
				settings: {
					vaultName: 'my-vault',
					tenantId: 'my-tenant-id',
					clientId: 'my-client-id',
					clientSecret: 'my-client-secret',
				},
			}),
		);

		const listSpy = vi.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets').mockImplementation(
			() =>
				({
					async *[Symbol.asyncIterator]() {
						yield { name: 'enabled-secret', enabled: true };
						yield { name: 'disabled-secret', enabled: false };
					},
				}) as never,
		);

		const getSpy = vi
			.spyOn(SecretClient.prototype, 'getSecret')
			.mockResolvedValue(mock<KeyVaultSecret>({ value: 'ok' }));

		await azureKeyVault.connect();
		await azureKeyVault.update();

		expect(listSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalledTimes(1);
		expect(getSpy).toHaveBeenCalledWith('enabled-secret');
		expect(azureKeyVault.getSecret('enabled-secret')).toBe('ok');
		expect(azureKeyVault.hasSecret('disabled-secret')).toBe(false);
	});

	it('should still load other secrets when one getSecret fails', async () => {
		await azureKeyVault.init(
			mock<AzureKeyVaultContext>({
				settings: {
					vaultName: 'my-vault',
					tenantId: 'my-tenant-id',
					clientId: 'my-client-id',
					clientSecret: 'my-client-secret',
				},
			}),
		);

		vi.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets').mockImplementation(
			() =>
				({
					async *[Symbol.asyncIterator]() {
						yield { name: 'good', enabled: true };
						yield { name: 'bad', enabled: true };
					},
				}) as never,
		);

		vi.spyOn(SecretClient.prototype, 'getSecret').mockImplementation(async (name: string) => {
			if (name === 'bad') {
				throw new Error('Forbidden');
			}
			return mock<KeyVaultSecret>({ value: 'fine' });
		});

		await azureKeyVault.connect();
		await azureKeyVault.update();

		expect(azureKeyVault.getSecret('good')).toBe('fine');
		expect(azureKeyVault.hasSecret('bad')).toBe(false);
		expect(logger.debug).toHaveBeenCalledWith(
			'Could not read Azure Key Vault secret "bad"',
			expect.objectContaining({
				providerName: 'azureKeyVault',
				operation: 'update',
				secretName: 'bad',
				vaultName: 'my-vault',
			}),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped unreadable Azure Key Vault secrets during update',
			expect.objectContaining({
				providerName: 'azureKeyVault',
				operation: 'update',
				vaultName: 'my-vault',
				failedCount: 1,
				sampleSecretNames: ['bad'],
			}),
		);
	});

	it('should throw when every getSecret fails and leave the previous cache unchanged', async () => {
		await azureKeyVault.init(
			mock<AzureKeyVaultContext>({
				settings: {
					vaultName: 'my-vault',
					tenantId: 'my-tenant-id',
					clientId: 'my-client-id',
					clientSecret: 'my-client-secret',
				},
			}),
		);

		vi.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets').mockImplementation(
			() =>
				({
					async *[Symbol.asyncIterator]() {
						yield { name: 'only-secret', enabled: true };
					},
				}) as never,
		);

		const getSpy = vi
			.spyOn(SecretClient.prototype, 'getSecret')
			.mockResolvedValue(mock<KeyVaultSecret>({ value: 'cached-value' }));

		await azureKeyVault.connect();
		await azureKeyVault.update();
		expect(azureKeyVault.getSecret('only-secret')).toBe('cached-value');

		getSpy.mockImplementation(async () => {
			throw new Error('Key Vault unavailable');
		});

		let thrown: unknown;
		try {
			await azureKeyVault.update();
		} catch (error: unknown) {
			thrown = error;
		}

		expect(thrown).toBeDefined();
		expect(thrown).toBeInstanceOf(UnexpectedError);
		if (thrown instanceof UnexpectedError) {
			expect(thrown.message).toBe('Could not read any secrets from Azure Key Vault');
			expect(thrown.cause).toEqual(expect.objectContaining({ message: 'Key Vault unavailable' }));
		}
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not read any secrets from Azure Key Vault',
			expect.objectContaining({
				providerName: 'azureKeyVault',
				operation: 'update',
				vaultName: 'my-vault',
				failedCount: 1,
				sampleSecretNames: ['only-secret'],
				errorName: 'Error',
			}),
		);
		expect(logger.warn).not.toHaveBeenCalledWith(
			'Skipped unreadable Azure Key Vault secrets during update',
			expect.anything(),
		);
		expect(azureKeyVault.getSecret('only-secret')).toBe('cached-value');
	});
});
