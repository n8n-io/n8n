import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ImpervaApi implements ICredentialType {
	name = 'impervaApi';
	displayName = 'Imperva API';
	documentationUrl = 'imperva';
	properties: INodeProperties[] = [
		{
			displayName: 'APP ID',
			name: 'appId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
