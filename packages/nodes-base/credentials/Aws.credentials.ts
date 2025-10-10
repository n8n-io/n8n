import { sign } from 'aws4';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

import type { AwsIamCredentialsType, AWSRegion } from './common/aws/types';
import { awsCredentialsTest, awsGetSignInOptionsAndUpdateRequest } from './common/aws/utils';
import { awsCustomEndpoints, awsRegionProperty } from './common/aws/descriptions';

function shouldStringifyBody<T>(value: T, headers: IDataObject): boolean {
	if (
		typeof value === 'object' &&
		value !== null &&
		!headers['Content-Length'] &&
		!headers['content-length'] &&
		!Buffer.isBuffer(value)
	) {
		return true;
	}

	return false;
}

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

		const { signOpts, endpoint } = awsGetSignInOptionsAndUpdateRequest(
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
