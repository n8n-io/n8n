import type { SecretsProviderSettings } from '../../types';

export type SecretsNamesPage = {
	NextToken?: string;
	SecretList: SecretName[];
};

export type SecretsPage = {
	NextToken?: string;
	SecretValues: SecretValue[];
};

type SecretName = {
	ARN: string;
	CreatedDate: number;
	LastAccessedDate: number;
	LastChangedDate: number;
	Name: string;
	Tags: string[];
};

type SecretValue = {
	ARN: string;
	CreatedDate: number;
	Name: string;
	SecretString: string;
	VersionId: string;
};

export type Secret = {
	secretName: string;
	secretValue: string;
};

export type ConnectionTestResult = Promise<[boolean] | [boolean, string]>;

export type AwsSecretsManagerContext = SecretsProviderSettings<{
	region: string;
	authMethod: 'iamUser';
	accessKeyId: string;
	secretAccessKey: string;
}>;

export type AwsSecretsClientSettings = {
	region: string;
	host: string;
	url: string;
	accessKeyId: string;
	secretAccessKey: string;
};
