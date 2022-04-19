import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class IntercomApi implements ICredentialType {
	name = 'intercomApi';
	displayName = 'Intercom API';
	documentationUrl = 'intercom';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
