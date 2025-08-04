'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const keyvault_secrets_1 = require('@azure/keyvault-secrets');
const jest_mock_extended_1 = require('jest-mock-extended');
const azure_key_vault_1 = require('../azure-key-vault/azure-key-vault');
jest.mock('@azure/identity');
jest.mock('@azure/keyvault-secrets');
describe('AzureKeyVault', () => {
	const azureKeyVault = new azure_key_vault_1.AzureKeyVault();
	afterEach(() => {
		jest.clearAllMocks();
	});
	it('should update cached secrets', async () => {
		await azureKeyVault.init(
			(0, jest_mock_extended_1.mock)({
				settings: {
					vaultName: 'my-vault',
					tenantId: 'my-tenant-id',
					clientId: 'my-client-id',
					clientSecret: 'my-client-secret',
				},
			}),
		);
		const listSpy = jest
			.spyOn(keyvault_secrets_1.SecretClient.prototype, 'listPropertiesOfSecrets')
			.mockImplementation(() => ({
				async *[Symbol.asyncIterator]() {
					yield { name: 'secret1' };
					yield { name: 'secret2' };
					yield { name: 'secret3' };
					yield { name: '#@&' };
				},
			}));
		const getSpy = jest
			.spyOn(keyvault_secrets_1.SecretClient.prototype, 'getSecret')
			.mockImplementation(async (name) => {
				return (0, jest_mock_extended_1.mock)({
					value: { secret1: 'value1', secret2: 'value2' }[name],
				});
			});
		await azureKeyVault.connect();
		await azureKeyVault.update();
		expect(listSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalledWith('secret1');
		expect(getSpy).toHaveBeenCalledWith('secret2');
		expect(getSpy).toHaveBeenCalledWith('secret3');
		expect(getSpy).not.toHaveBeenCalledWith('#@&');
		expect(azureKeyVault.getSecret('secret1')).toBe('value1');
		expect(azureKeyVault.getSecret('secret2')).toBe('value2');
		expect(azureKeyVault.getSecret('secret3')).toBeUndefined();
		expect(azureKeyVault.getSecret('#@&')).toBeUndefined();
	});
});
//# sourceMappingURL=azure-key-vault.test.js.map
