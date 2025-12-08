import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

import type { AwsIamCredentialsType, AWSRegion } from './common/aws/types';
import {
	awsCredentialsTest,
	awsGetSignInOptionsAndUpdateRequest,
	signOptions,
} from './common/aws/utils';
import { awsCustomEndpoints, awsRegionProperty } from './common/aws/descriptions';

export class Aws implements ICredentialType {
	name = 'aws';

	displayName = 'AWS (IAM)';

	documentationUrl = 'aws';

	icon = { light: 'file:icons/AWS.svg', dark: 'file:icons/AWS.dark.svg' } as const;

	properties: INodeProperties[] = [
		awsRegionProperty,
		{
			displayName: 'Authentication Type',
			name: 'authenticationType',
			type: 'options',
			options: [
				{
					name: 'Access Keys',
					value: 'accessKey',
					description: 'Use AWS Access Key ID and Secret Access Key',
				},
				{
					name: 'AWS Profile',
					value: 'profile',
					description: 'Use AWS CLI profile from ~/.aws/credentials',
				},
			],
			default: 'accessKey',
			description: 'How to authenticate with AWS',
		},
		{
			displayName: 'AWS Profile',
			name: 'awsProfile',
			type: 'options',
			options: [
				{
					name: 'default',
					value: 'default',
				},
			],
			default: 'default',
			required: true,
			displayOptions: {
				show: {
					authenticationType: ['profile'],
				},
			},
			typeOptions: {
				allowArbitraryValues: true,
			},
			description: 'AWS profile name from ~/.aws/credentials file. Type a custom profile name or use "default".',
		},
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authenticationType: ['accessKey'],
				},
			},
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authenticationType: ['accessKey'],
				},
			},
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Temporary Security Credentials',
			name: 'temporaryCredentials',
			description: 'Support for temporary credentials from AWS STS',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					authenticationType: ['accessKey'],
				},
			},
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			displayOptions: {
				show: {
					authenticationType: ['accessKey'],
					temporaryCredentials: [true],
				},
			},
			default: '',
			typeOptions: {
				password: true,
			},
		},
		...awsCustomEndpoints,
	];

	async authenticate(
		rawCredentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentials = rawCredentials as AwsIamCredentialsType;
		const service = requestOptions.qs?.service as string;
		const path = (requestOptions.qs?.path as string) ?? '';
		const method = requestOptions.method;

		let region = credentials.region;
		if (requestOptions.qs?._region) {
			region = requestOptions.qs._region as AWSRegion;
			delete requestOptions.qs._region;
		}

		const { signOpts, url } = awsGetSignInOptionsAndUpdateRequest(
			requestOptions,
			credentials,
			path,
			method,
			service,
			region,
		);

		let securityHeaders: {
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken: string | undefined;
		};

		// Check authentication type - profile or access keys
		if (credentials.authenticationType === 'profile' && credentials.awsProfile) {
			// Use AWS profile authentication
			const profileName = credentials.awsProfile || 'default';

			// Set up environment variables for the profile
			const previousEnv = {
				AWS_PROFILE: process.env.AWS_PROFILE,
				AWS_REGION: process.env.AWS_REGION,
			};

			try {
				process.env.AWS_PROFILE = profileName;
				process.env.AWS_REGION = region;

				// Get credentials from profile using AWS SDK
				const credentialProvider = fromNodeProviderChain({
					profile: profileName,
					ignoreCache: true,
				});

				const resolvedCredentials = await credentialProvider();

				securityHeaders = {
					accessKeyId: resolvedCredentials.accessKeyId,
					secretAccessKey: resolvedCredentials.secretAccessKey,
					sessionToken: resolvedCredentials.sessionToken,
				};
			} finally {
				// Restore previous environment variables
				if (previousEnv.AWS_PROFILE !== undefined) {
					process.env.AWS_PROFILE = previousEnv.AWS_PROFILE;
				} else {
					delete process.env.AWS_PROFILE;
				}
				if (previousEnv.AWS_REGION !== undefined) {
					process.env.AWS_REGION = previousEnv.AWS_REGION;
				} else {
					delete process.env.AWS_REGION;
				}
			}
		} else {
			// Use access key authentication (default, backwards compatible)
			securityHeaders = {
				accessKeyId: `${credentials.accessKeyId}`.trim(),
				secretAccessKey: `${credentials.secretAccessKey}`.trim(),
				sessionToken: credentials.temporaryCredentials
					? `${credentials.sessionToken}`.trim()
					: undefined,
			};
		}

		return signOptions(requestOptions, signOpts, securityHeaders, url, method);
	}

	test = awsCredentialsTest;
}
