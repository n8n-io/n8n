import type { IDataObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

export function getSecretsProxy(additionalData: IWorkflowExecuteAdditionalData): IDataObject {
	const secretsHelpers = additionalData.secretsHelpers;
	return new Proxy(
		{},
		{
			get(target, providerName) {
				if (typeof providerName !== 'string') {
					return {};
				}
				if (secretsHelpers.hasProvider(providerName)) {
					return new Proxy(
						{},
						{
							get(target2, secretName): IDataObject | undefined {
								if (typeof secretName !== 'string') {
									return;
								}
								return secretsHelpers.getSecret(providerName, secretName);
							},
							set() {
								return false;
							},
							ownKeys() {
								return secretsHelpers.listSecrets(providerName);
							},
						},
					);
				}
				return {};
			},
			set() {
				return false;
			},
			ownKeys() {
				return secretsHelpers.listProviders();
			},
		},
	);
}
