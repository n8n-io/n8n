import { ExpressionError } from 'n8n-workflow';
import type { IDataObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	ExternalSecretsProxy,
	type IExternalSecretsManager,
} from '@/execution-engine/external-secrets-proxy';

import { getSecretsProxy } from '../get-secrets-proxy';

describe('getSecretsProxy', () => {
	const externalSecretsProxy = mock<ExternalSecretsProxy>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		externalSecretsProxy,
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('ownKeys()', () => {
		it.each([
			['control', 'control'],
			['test.1', "['test.1']"],
			['test[1]', "['test[1]']"],
			["test.'1", "['test.\\'1']"],
			['test.\\1', "['test.\\\\1']"],
			['', "['']"],
		])('should return a usable property key for the secret %j', (key, discoveryPath) => {
			const secrets = { [key]: 'secret-value' };
			const manager = mock<IExternalSecretsManager>();
			manager.hasProvider.mockReturnValue(true);
			manager.getSecretNames.mockReturnValue([discoveryPath]);
			manager.hasSecret.mockImplementation((_provider, name) => Object.hasOwn(secrets, name));
			manager.getSecret.mockImplementation((_provider, name) => secrets[name]);
			const runtimeProxy = new ExternalSecretsProxy();
			runtimeProxy.setManager(manager);
			const runtimeData = mock<IWorkflowExecuteAdditionalData>();
			runtimeData.externalSecretsProxy = runtimeProxy;
			runtimeData.externalSecretProviderKeysAccessibleByCredential = new Set(['aws']);
			const proxy = getSecretsProxy(runtimeData);
			const provider = proxy.aws as IDataObject;

			const keys = Object.getOwnPropertyNames(provider);

			expect(keys).toEqual([key]);
			expect(provider[keys[0]]).toBe('secret-value');
		});

		it('should enumerate each top-level key once for nested discovery paths', () => {
			const secrets: IDataObject = {
				'app.production': { username: 'user', password: 'secret-value' },
				app: { production: 'nested-value' },
			};
			const manager = mock<IExternalSecretsManager>();
			manager.hasProvider.mockReturnValue(true);
			manager.getSecretNames.mockReturnValue([
				"['app.production'].username",
				"['app.production'].password",
				'app.production',
			]);
			manager.hasSecret.mockImplementation((_provider, name) => Object.hasOwn(secrets, name));
			manager.getSecret.mockImplementation((_provider, name) => secrets[name]);
			const runtimeProxy = new ExternalSecretsProxy();
			runtimeProxy.setManager(manager);
			const runtimeData = mock<IWorkflowExecuteAdditionalData>();
			runtimeData.externalSecretsProxy = runtimeProxy;
			runtimeData.externalSecretProviderKeysAccessibleByCredential = new Set(['vault']);
			const proxy = getSecretsProxy(runtimeData);
			const provider = proxy.vault as IDataObject;

			const keys = Object.getOwnPropertyNames(provider);

			expect(keys).toEqual(['app.production', 'app']);
			expect((provider[keys[0]] as IDataObject).password).toBe('secret-value');
			expect((provider[keys[1]] as IDataObject).production).toBe('nested-value');
		});
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
