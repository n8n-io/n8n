import type { AWSRegion } from './regions';

export type AwsCredentialsTypeBase = {
	region: AWSRegion;
	customEndpoints: boolean;
	rekognitionEndpoint?: string;
	lambdaEndpoint?: string;
	snsEndpoint?: string;
	sesEndpoint?: string;
	sqsEndpoint?: string;
	s3Endpoint?: string;
	ssmEndpoint?: string;
	bedrockEndpoint?: string;
	bedrockRuntimeEndpoint?: string;
};

export type AwsIamCredentialsType = AwsCredentialsTypeBase & {
	accessKeyId: string;
	secretAccessKey: string;
	temporaryCredentials: boolean;
	sessionToken?: string;
};

export type AwsAssumeRoleCredentialsType = AwsCredentialsTypeBase & {
	assumeRole?: boolean;
	roleArn?: string;
	externalId?: string;
	roleSessionName?: string;
	useSystemCredentialsForRole?: boolean;
	stsAccessKeyId?: string;
	stsSecretAccessKey?: string;
	stsSessionToken?: string;
};

export type AwsSecurityHeaders = {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken: string | undefined;
};
