import type { INodeCredentialDescription, INodeProperties } from 'n8n-workflow';

export const awsNodeCredentials: INodeCredentialDescription[] = [
	{
		name: 'aws',
		required: true,
		displayOptions: {
			show: {
				authentication: ['iam'],
			},
		},
	},
	{
		name: 'awsAssumeRole',
		required: true,
		displayOptions: {
			show: {
				authentication: ['assumeRole'],
			},
		},
	},
];
export const awsNodeAuthOptions: INodeProperties = {
	displayName: 'Authentication',
	name: 'authentication',
	type: 'options',
	options: [
		{
			name: 'AWS (IAM)',
			value: 'iam',
		},
		{
			name: 'AWS (Assume Role)',
			value: 'assumeRole',
		},
	],
	default: 'iam',
};
