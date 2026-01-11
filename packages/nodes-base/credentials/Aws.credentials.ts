import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

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
			displayName: 'Authentication Method',
			name: 'authenticationMethod',
			type: 'options',
			options: [
				{ name: 'Access Keys', value: 'accessKeys' },
				{ name: 'AWS CLI Profile', value: 'profile' },
			],
			default: 'accessKeys',
			description: 'How to authenticate with AWS',
		},
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
			displayOptions: {
				show: { authenticationMethod: ['accessKeys'] },
			},
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: { authenticationMethod: ['accessKeys'] },
			},
		},
		{
			displayName: 'Temporary Security Credentials',
			name: 'temporaryCredentials',
			description: 'Support for temporary credentials from AWS STS',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: { authenticationMethod: ['accessKeys'] },
			},
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			displayOptions: {
				show: {
					authenticationMethod: ['accessKeys'],
					temporaryCredentials: [true],
				},
			},
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Profile Name',
			name: 'profileName',
			type: 'string',
			default: 'default',
			description: 'AWS CLI profile name from ~/.aws/credentials',
			placeholder: 'default',
			displayOptions: {
				show: { authenticationMethod: ['profile'] },
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

		// Resolve credentials based on authentication method
		let accessKeyId: string;
		let secretAccessKey: string;
		let sessionToken: string | undefined;

		if (credentials.authenticationMethod === 'profile') {
			// For profile auth, resolve credentials from AWS CLI config
			const { fromIni } = await import('@aws-sdk/credential-providers');
			const credentialProvider = fromIni({
				profile: credentials.profileName || 'default',
				ignoreCache: true,
			});
			const resolvedCreds = await credentialProvider();
			accessKeyId = resolvedCreds.accessKeyId;
			secretAccessKey = resolvedCreds.secretAccessKey;
			sessionToken = resolvedCreds.sessionToken;
		} else {
			// For access keys, use credentials directly
			accessKeyId = `${credentials.accessKeyId}`.trim();
			secretAccessKey = `${credentials.secretAccessKey}`.trim();
			sessionToken = credentials.temporaryCredentials
				? `${credentials.sessionToken}`.trim()
				: undefined;
		}

		const securityHeaders = {
			accessKeyId,
			secretAccessKey,
			sessionToken,
		};

		return signOptions(requestOptions, signOpts, securityHeaders, url, method);
	}

	test = awsCredentialsTest;
}
