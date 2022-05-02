import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PushoverApi implements ICredentialType {
	name = 'pushoverApi';
	displayName = 'Pushover API';
	documentationUrl = 'pushover';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
