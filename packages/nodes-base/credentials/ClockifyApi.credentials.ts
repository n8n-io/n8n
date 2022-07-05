import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class ClockifyApi implements ICredentialType {
	name = 'clockifyApi';
	displayName = 'Clockify API';
	documentationUrl = 'clockify';
	properties: INodeProperties[] = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
