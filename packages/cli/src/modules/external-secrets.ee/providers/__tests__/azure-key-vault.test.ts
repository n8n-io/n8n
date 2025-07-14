import { SecretClient } from '@azure/keyvault-secrets';
import type { KeyVaultSecret } from '@azure/keyvault-secrets';
import { mock } from 'jest-mock-extended';

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
					yield { name: '#@&' }; // unsupported name
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
		expect(getSpy).not.toHaveBeenCalledWith('#@&');

		expect(azureKeyVault.getSecret('secret1')).toBe('value1');
		expect(azureKeyVault.getSecret('secret2')).toBe('value2');
		expect(azureKeyVault.getSecret('secret3')).toBeUndefined(); // no value
		expect(azureKeyVault.getSecret('#@&')).toBeUndefined(); // unsupported name
	});
});
