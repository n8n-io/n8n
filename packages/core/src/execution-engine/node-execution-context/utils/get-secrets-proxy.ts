import type { IDataObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { ExpressionError } from 'n8n-workflow';

function buildSecretsValueProxy(value: IDataObject): unknown {
	return new Proxy(value, {
		get(_target, valueName) {
			if (typeof valueName !== 'string') {
				return;
			}
			if (!(valueName in value)) {
				throw new ExpressionError('Could not load secrets', {
					description:
						'The credential in use tries to use secret from an external store that could not be found',
				});
			}
			const retValue = value[valueName];
			if (typeof retValue === 'object' && retValue !== null) {
				return buildSecretsValueProxy(retValue as IDataObject);
			}
			return retValue;
		},
	});
}

export function getSecretsProxy(additionalData: IWorkflowExecuteAdditionalData): IDataObject {
	const { externalSecretsProxy, externalSecretProviderKeysAccessibleByCredential } = additionalData;
	return new Proxy(
		{},
		{
			get(_target, providerName) {
				if (typeof providerName !== 'string') {
					return {};
				}
				// TODO: require externalSecretProviderKeysAccessibleByCredential to be defined to be able
				// to access projects. This needs manual validation that all palces that call getSecretsProxy
				// also set externalSecretProviderKeysAccessibleByCredential beforehand
				const credentialHasAccessToProvider =
					!externalSecretProviderKeysAccessibleByCredential ||
					externalSecretProviderKeysAccessibleByCredential.has(providerName);
				if (!credentialHasAccessToProvider || !externalSecretsProxy.hasProvider(providerName)) {
					throw new ExpressionError('Could not load secrets', {
						description:
							'The credential in use pulls secrets from an external store that is not reachable',
					});
				}

				return new Proxy(
					{},
					{
						get(_target2, secretName) {
							if (typeof secretName !== 'string') {
								return;
							}
							if (!externalSecretsProxy.hasSecret(providerName, secretName)) {
								throw new ExpressionError('Could not load secrets', {
									description:
										'The credential in use tries to use secret from an external store that could not be found',
								});
							}
							const retValue = externalSecretsProxy.getSecret(providerName, secretName);
							if (typeof retValue === 'object' && retValue !== null) {
								return buildSecretsValueProxy(retValue as IDataObject);
							}
							return retValue;
						},
						set() {
							return false;
						},
						ownKeys() {
							return externalSecretsProxy.listSecrets(providerName);
						},
					},
				);
			},
			set() {
				return false;
			},
			ownKeys() {
				return externalSecretsProxy.listProviders();
			},
		},
	);
}
