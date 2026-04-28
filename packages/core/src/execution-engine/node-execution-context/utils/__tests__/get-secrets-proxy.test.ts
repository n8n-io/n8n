import { mock } from 'jest-mock-extended';
import { ExpressionError } from 'n8n-workflow';
import type { IDataObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type { ExternalSecretsProxy } from '@/execution-engine/external-secrets-proxy';

import { getSecretsProxy } from '../get-secrets-proxy';

describe('getSecretsProxy', () => {
	const externalSecretsProxy = mock<ExternalSecretsProxy>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		externalSecretsProxy,
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('get()', () => {
		it('should throw an error if the requested provider is not accessible as per additionalData payload', () => {
			additionalData.externalSecretProviderKeysAccessibleByCredential = new Set();

			const proxy = getSecretsProxy(additionalData);

			expect(() => proxy.providerName).toThrow(ExpressionError);
		});

		it('should throw an error if the externalSecretsProxy does not know the requested provider', () => {
			additionalData.externalSecretProviderKeysAccessibleByCredential = new Set(['providerName']);
			externalSecretsProxy.hasProvider.mockReturnValue(false);

			const proxy = getSecretsProxy(additionalData);

			expect(() => proxy.providerName).toThrow(ExpressionError);
		});

		it('should throw an error if the externalSecretsProxy does not know the requested secretName', () => {
			additionalData.externalSecretProviderKeysAccessibleByCredential = new Set(['providerName']);
			externalSecretsProxy.hasProvider.mockReturnValue(true);
			externalSecretsProxy.hasSecret.mockReturnValue(false);

			const proxy = getSecretsProxy(additionalData);

			expect(() => (proxy.providerName as IDataObject).secretName).toThrow(ExpressionError);
		});

		// for easy backwards compatibility, we keep the same behaviour as before when no externalSecretProviderKeysAccessibleByCredential existed
		it('should return the value from the ExternalSecretsProxy if externalSecretProviderKeysAccessibleByCredential is undefined', () => {
			additionalData.externalSecretProviderKeysAccessibleByCredential = undefined;
			externalSecretsProxy.hasProvider.mockReturnValue(true);
			externalSecretsProxy.hasSecret.mockReturnValue(true);
			externalSecretsProxy.getSecret.mockReturnValue('secretValue');

			const proxy = getSecretsProxy(additionalData);

			expect((proxy.providerName as IDataObject).secretName).toBe('secretValue');
		});

		it('should return the value from the ExternalSecretsProxy', () => {
			additionalData.externalSecretProviderKeysAccessibleByCredential = new Set(['providerName']);
			externalSecretsProxy.hasProvider.mockReturnValue(true);
			externalSecretsProxy.hasSecret.mockReturnValue(true);
			externalSecretsProxy.getSecret.mockReturnValue('secretValue');

			const proxy = getSecretsProxy(additionalData);

			expect((proxy.providerName as IDataObject).secretName).toBe('secretValue');
		});
	});
});
