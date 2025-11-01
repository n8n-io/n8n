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
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			default: '',
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
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			displayOptions: {
				show: {
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

		const securityHeaders = {
			accessKeyId: `${credentials.accessKeyId}`.trim(),
			secretAccessKey: `${credentials.secretAccessKey}`.trim(),
			sessionToken: credentials.temporaryCredentials
				? `${credentials.sessionToken}`.trim()
				: undefined,
		};

		return signOptions(requestOptions, signOpts, securityHeaders, url, method);
	}

	test = awsCredentialsTest;
}
