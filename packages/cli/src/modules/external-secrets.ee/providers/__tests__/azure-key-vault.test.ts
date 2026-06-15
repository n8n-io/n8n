import { SecretClient } from '@azure/keyvault-secrets';
import type { KeyVaultSecret } from '@azure/keyvault-secrets';
import { mock } from 'jest-mock-extended';
import { UnexpectedError } from 'n8n-workflow';

import { AzureKeyVault } from '../azure-key-vault/azure-key-vault';
import type { AzureKeyVaultContext } from '../azure-key-vault/types';

jest.mock('@azure/identity');
jest.mock('@azure/keyvault-secrets');

describe('AzureKeyVault', () => {
	const azureKeyVault = new AzureKeyVault();

	afterEach(() => {
		jest.clearAllMocks();
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

		const listSpy = jest
			.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets')
			// @ts-expect-error Partial mock
			.mockImplementation(() => ({
				async *[Symbol.asyncIterator]() {
					yield { name: 'secret1' };
					yield { name: 'secret2' };
					yield { name: 'secret3' }; // no value
				},
			}));

		const getSpy = jest
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

		const listSpy = jest
			.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets')
			// @ts-expect-error Partial mock
			.mockImplementation(() => ({
				async *[Symbol.asyncIterator]() {
					yield { name: 'enabled-secret', enabled: true };
					yield { name: 'disabled-secret', enabled: false };
				},
			}));

		const getSpy = jest
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

		// @ts-expect-error Partial mock
		jest.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets').mockImplementation(() => ({
			async *[Symbol.asyncIterator]() {
				yield { name: 'good', enabled: true };
				yield { name: 'bad', enabled: true };
			},
		}));

		jest.spyOn(SecretClient.prototype, 'getSecret').mockImplementation(async (name: string) => {
			if (name === 'bad') {
				throw new Error('Forbidden');
			}
			return mock<KeyVaultSecret>({ value: 'fine' });
		});

		await azureKeyVault.connect();
		await azureKeyVault.update();

		expect(azureKeyVault.getSecret('good')).toBe('fine');
		expect(azureKeyVault.hasSecret('bad')).toBe(false);
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

		// @ts-expect-error Partial mock
		jest.spyOn(SecretClient.prototype, 'listPropertiesOfSecrets').mockImplementation(() => ({
			async *[Symbol.asyncIterator]() {
				yield { name: 'only-secret', enabled: true };
			},
		}));

		const getSpy = jest
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
		expect(azureKeyVault.getSecret('only-secret')).toBe('cached-value');
	});
});
