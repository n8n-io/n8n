import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

import type { AWSRegion, AwsProfileCredentialSource } from './common/aws/types';
import {
	awsCredentialsTest,
	awsGetSignInOptionsAndUpdateRequest,
	signOptions,
} from './common/aws/utils';
import { awsCustomEndpoints, awsRegionProperty } from './common/aws/descriptions';
import { resolveCredentials } from './common/aws/profile-credentials-utils';

export class AwsProfile implements ICredentialType {
	name = 'awsProfile';

	displayName = 'AWS (Profile/Instance)';

	documentationUrl = 'awsprofile';

	icon = { light: 'file:icons/AWS.svg', dark: 'file:icons/AWS.dark.svg' } as const;

	properties: INodeProperties[] = [
		awsRegionProperty,
		{
			displayName: 'Credential Source',
			name: 'credentialSource',
			type: 'options',
			options: [
				{
					name: 'Named Profile',
					value: 'profile',
					description:
						'Use a named profile from ~/.aws/credentials or ~/.aws/config (supports static credentials, SSO, and role assumption)',
				},
				{
					name: 'EC2 Instance Profile',
					value: 'instanceMetadata',
					description: 'Use EC2 instance metadata service (IMDSv2) - for n8n running on EC2',
				},
				{
					name: 'ECS Task Role',
					value: 'containerMetadata',
					description: 'Use ECS container metadata service - for n8n running in ECS/Fargate',
				},
				{
					name: 'EKS Pod Identity / IRSA',
					value: 'tokenFile',
					description: 'Use web identity token file - for n8n running in EKS',
				},
				{
					name: 'Auto-detect (Credential Chain)',
					value: 'chain',
					description: 'Automatically detect credentials using the full AWS credential chain',
				},
			],
			default: 'profile',
			description: 'How to obtain AWS credentials',
		},
		{
			displayName: 'Profile Name',
			name: 'profileName',
			type: 'string',
			default: 'default',
			description:
				'The name of the AWS profile to use. Supports static credentials, SSO profiles, and profiles with role_arn.',
			placeholder: 'default',
			displayOptions: {
				show: {
					credentialSource: ['profile', 'chain'],
				},
			},
		},
		{
			displayName: 'Role ARN (Optional)',
			name: 'roleArn',
			type: 'string',
			default: '',
			description: 'Override the role ARN from AWS_ROLE_ARN environment variable',
			placeholder: 'arn:aws:iam::123456789012:role/MyRole',
			displayOptions: {
				show: {
					credentialSource: ['tokenFile'],
				},
			},
		},
		{
			displayName: 'Role Session Name',
			name: 'roleSessionName',
			type: 'string',
			default: 'n8n-session',
			description: 'A name for the assumed role session',
			displayOptions: {
				show: {
					credentialSource: ['tokenFile'],
				},
			},
		},
		{
			displayName:
				'This credential type requires N8N_AWS_SYSTEM_CREDENTIALS_ACCESS_ENABLED=true to be set in your environment.',
			name: 'securityNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				hideOnCloud: true,
			},
		},
		...awsCustomEndpoints,
	];

	async authenticate(
		rawCredentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentials = rawCredentials as {
			region: AWSRegion;
			credentialSource: AwsProfileCredentialSource;
			profileName?: string;
			roleArn?: string;
			roleSessionName?: string;
			customEndpoints: boolean;
			rekognitionEndpoint?: string;
			lambdaEndpoint?: string;
			snsEndpoint?: string;
			sesEndpoint?: string;
			sqsEndpoint?: string;
			s3Endpoint?: string;
			ssmEndpoint?: string;
		};

		const service = requestOptions.qs?.service as string;
		const path = (requestOptions.qs?.path as string) ?? '';
		const method = requestOptions.method;

		let region = credentials.region;
		if (requestOptions.qs?._region) {
			region = requestOptions.qs._region as AWSRegion;
			delete requestOptions.qs._region;
		}

		// Resolve credentials using AWS SDK - NO process.env mutation!
		const resolvedCredentials = await resolveCredentials({
			source: credentials.credentialSource,
			profile: credentials.profileName,
			region,
			roleArn: credentials.roleArn || undefined,
			roleSessionName: credentials.roleSessionName,
		});

		const { signOpts, url } = awsGetSignInOptionsAndUpdateRequest(
			requestOptions,
			credentials,
			path,
			method,
			service,
			region,
		);

		const securityHeaders = {
			accessKeyId: resolvedCredentials.accessKeyId,
			secretAccessKey: resolvedCredentials.secretAccessKey,
			sessionToken: resolvedCredentials.sessionToken,
		};

		return signOptions(requestOptions, signOpts, securityHeaders, url, method);
	}

	test = awsCredentialsTest;
}
