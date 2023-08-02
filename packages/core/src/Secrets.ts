import type { IDataObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { ExpressionError } from 'n8n-workflow';

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
								if (!secretsHelpers.hasSecret(providerName, secretName)) {
									throw new ExpressionError('Could not load secrets', {
										description:
											'The credential in use tries to use secret from an external store that could not be found',
									});
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
				throw new ExpressionError('Could not load secrets', {
					description:
						'The credential in use pulls secrets from an external store that is not reachable',
				});
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
