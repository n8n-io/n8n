import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class YealinkApi implements ICredentialType {
	name = 'yealinkApi';
	displayName = 'Yealink Api';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: 'https://api-dm.yealink.com:8445',
			description: 'The main URL including the port number',
		},
		{
			displayName: 'X-Ca-Key',
			name: 'xCaKey',
			type: 'string',
			default: '',
			description: 'The AccessKey ID',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'The AccessKey Secret',
		},
	];
}
