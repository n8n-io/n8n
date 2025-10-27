import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class S3 implements ICredentialType {
	name = 's3';

	displayName = 'S3';

	documentationUrl = 's3';

	properties: INodeProperties[] = [
		{
			displayName: 'S3 Endpoint',
			name: 'endpoint',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: 'us-east-1',
		},
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
			displayName: 'Force Path Style',
			name: 'forcePathStyle',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'ignoreSSLIssues',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if SSL certificate validation is not possible',
		},
	];
}
