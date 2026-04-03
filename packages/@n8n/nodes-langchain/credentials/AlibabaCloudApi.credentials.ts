import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { BASE_URL_EXPRESSION } from '../nodes/llms/LmChatAlibabaCloud/alibaba-cloud-base-url';

export class AlibabaCloudApi implements ICredentialType {
	name = 'alibabaCloudApi';

	displayName = 'Alibaba Cloud';

	documentationUrl = 'alibaba';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'ap-southeast-1',
			options: [
				{
					name: 'Singapore (International)',
					value: 'ap-southeast-1',
				},
				{
					name: 'US (Virginia)',
					value: 'us-east-1',
				},
				{
					name: 'China (Beijing)',
					value: 'cn-beijing',
				},
				{
					name: 'Hong Kong (China)',
					value: 'cn-hongkong',
				},
				{
					name: 'Germany (Frankfurt)',
					value: 'eu-central-1',
				},
			],
			description: 'The region for the Alibaba Cloud Model Studio API endpoint',
		},
		{
			displayName: 'Workspace ID',
			name: 'workspaceId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					region: ['eu-central-1'],
				},
			},
			description:
				'The Workspace ID required for the Germany (Frankfurt) region. Find it in the Model Studio console under the Germany region settings.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: BASE_URL_EXPRESSION,
			url: '/models',
		},
	};
}
