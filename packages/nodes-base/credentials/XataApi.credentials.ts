import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class XataApi implements ICredentialType {
	name = 'xataApi';
	displayName = 'Xata API';
	documentationUrl = 'Xata';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
