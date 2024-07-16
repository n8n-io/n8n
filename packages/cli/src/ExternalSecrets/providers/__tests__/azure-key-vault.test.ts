import { KeyVaultSecret, SecretClient } from '@azure/keyvault-secrets';
import { AzureKeyVault } from '../azure-key-vault/azure-key-vault';
import { mock } from 'jest-mock-extended';
import { AzureKeyVaultContext } from '../azure-key-vault/types';

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
		azureKeyVault.init(
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
				[Symbol.asyncIterator]: async function* () {
					yield { name: 'secret1' };
					yield { name: 'secret2' };
					yield { name: '#@&' };
				},
			}));

		const getSpy = jest
			.spyOn(SecretClient.prototype, 'getSecret')
			.mockImplementation((name: string) => {
				return Promise.resolve(
					mock<KeyVaultSecret>({ value: { secret1: 'value1', secret2: 'value2' }[name] }),
				);
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
		expect(getSpy).not.toHaveBeenCalledWith('#@&');

		expect(azureKeyVault.getSecret('secret1')).toBe('value1');
		expect(azureKeyVault.getSecret('secret2')).toBe('value2');
		expect(azureKeyVault.getSecret('#@&')).toBeUndefined();
	});
});
