import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ApiTemplateIoApi implements ICredentialType {
	name = 'apiTemplateIoApi';
	displayName = 'APITemplate.io API';
	documentationUrl = 'apiTemplateIo';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
