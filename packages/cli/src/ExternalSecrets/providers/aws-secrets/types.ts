import type { SecretsProviderSettings } from '@/Interfaces';

export type SecretsNamesPage = {
	NextToken?: string;
	SecretList: SecretName[];
};

export type SecretsPage = {
	NextToken?: string;
	Errors: unknown[]; // @TODO
	SecretValues: SecretValue[];
};

type SecretName = {
	ARN: string;
	CreatedDate: number;
	LastAccessedDate: number;
	LastChangedDate: number;
	Name: 'string';
	SecretVersionsToStages: unknown; // @TODO
	Tags: string[];
};

type SecretValue = {
	ARN: string;
	CreatedDate: number;
	Name: string;
	SecretString: string;
	VersionId: string;
	VersionStages: unknown; // @TODO
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
