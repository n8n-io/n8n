import { sign } from 'aws4';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { type AwsAssunmeRoleCredentialsType, type AWSRegion } from './common/aws/types';
import { awsCustomEndpoints, awsRegionProperty } from './common/aws/descriptions';
import {
	assumeRole,
	awsCredentialsTest,
	awsGetSignInOptionsAndUpdateRequest,
} from './common/aws/utils';

export class AwsAssumeRole implements ICredentialType {
	name = 'awsAssumeRole';

	displayName = 'AWS (Assume Role)';

	documentationUrl = 'awsassumerole';

	icon = { light: 'file:icons/AWS.svg', dark: 'file:icons/AWS.dark.svg' } as const;

	properties: INodeProperties[] = [
		awsRegionProperty,
		{
			displayName: 'Role ARN',
			name: 'roleArn',
			description: 'The ARN of the role to assume (e.g., arn:aws:iam::123456789012:role/MyRole)',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'arn:aws:iam::123456789012:role/MyRole',
		},
		{
			displayName: 'External ID',
			name: 'externalId',
			description:
				"External ID for cross-account role assumption (should be required by your role's trust policy). This really should be generated automatically by n8n but there is not a way to do this automatically. Given this limitation, **you should treat this value as a secret and not share it with any other users of this n8n instance.** For more information, see https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html",
			type: 'string',
			required: true,
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Role Session Name',
			name: 'roleSessionName',
			description: 'Name for the role session (required, defaults to n8n-session)',
			type: 'string',
			required: true,
			default: 'n8n-session',
		},
		{
			displayName: 'Use System Credentials for STS Call',
			name: 'useSystemCredentialsForRole',
			description:
				'Use system credentials (environment variables, container role, etc.) to call STS.AssumeRole. If system credentials are not configured by your administrator, you must provide an access key id and secret access key below that has the necessary permissions to assume the role.',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Temporary STS Credentials',
			name: 'temporaryStsCredentials',
			description: 'Support for temporary credentials for the STS.AssumeRole call',
			type: 'boolean',
			displayOptions: {
				show: {
					useSystemCredentialsForRole: [false],
				},
			},
			default: false,
		},
		{
			displayName: 'STS Access Key ID',
			name: 'stsAccessKeyId',
			description:
				'Access Key ID to use for the STS.AssumeRole call (only if not using system credentials)',
			type: 'string',
			displayOptions: {
				show: {
					useSystemCredentialsForRole: [false],
				},
			},
			required: true,
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'STS Secret Access Key',
			name: 'stsSecretAccessKey',
			description:
				'Secret Access Key to use for the STS.AssumeRole call (only if not using system credentials)',
			type: 'string',
			displayOptions: {
				show: {
					useSystemCredentialsForRole: [false],
				},
			},
			required: true,
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'STS Session Token',
			name: 'stsSessionToken',
			description:
				'Session Token to use for the STS.AssumeRole call (only needed when using temporary STS credentials)',
			type: 'string',
			displayOptions: {
				show: {
					useSystemCredentialsForRole: [false],
					temporaryStsCredentials: [true],
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
		decryptedCredentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentials = decryptedCredentials as AwsAssunmeRoleCredentialsType;
		const service = requestOptions.qs?.service as string;
		const path = (requestOptions.qs?.path as string) ?? '';
		const method = requestOptions.method;

		let region = credentials.region;
		if (requestOptions.qs?._region) {
			region = requestOptions.qs._region as AWSRegion;
			delete requestOptions.qs._region;
		}

		// Handle role assumption if enabled
		let finalCredentials = credentials;
		let securityHeaders: {
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken: string;
		};

		if (!credentials.roleArn || credentials.roleArn.trim() === '') {
			throw new ApplicationError('Role ARN is required when assuming a role.');
		}
		if (!credentials.externalId || credentials.externalId.trim() === '') {
			throw new ApplicationError('External ID is required when assuming a role.');
		}
		if (!credentials.roleSessionName || credentials.roleSessionName.trim() === '') {
			throw new ApplicationError('Role Session Name is required when assuming a role.');
		}
		try {
			securityHeaders = await assumeRole(credentials, region);
			finalCredentials = { ...credentials, ...securityHeaders };
		} catch (error) {
			console.error('Failed to assume role:', error);
			throw new ApplicationError(
				`Failed to assume role: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}

		const { signOpts, endpoint } = awsGetSignInOptionsAndUpdateRequest(
			requestOptions,
			finalCredentials,
			path,
			method,
			service,
			region,
		);

		try {
			sign(signOpts, securityHeaders);
		} catch (err) {
			console.error(err);
		}
		const options: IHttpRequestOptions = {
			...requestOptions,
			headers: signOpts.headers,
			method,
			url: endpoint.origin + path,
			body: signOpts.body,
			qs: undefined, // override since it's already in the url
		};

		return options;
	}

	test = awsCredentialsTest;
}
