import type { SecretsProviderSettings } from '../../types';

export type Secret = {
	secretName: string;
	secretValue: string;
};

export type AwsSecretsManagerSettings = {
	region: string;
	authMethod: 'iamUser' | 'autoDetect';
};

export type AwsSecretsManagerContext = SecretsProviderSettings<
	{
		region: string;
	} & (
		| {
				authMethod: 'iamUser';
				accessKeyId: string;
				secretAccessKey: string;
		  }
		| { authMethod: 'autoDetect' }
	)
>;
