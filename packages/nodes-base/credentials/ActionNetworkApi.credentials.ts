import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ActionNetworkApi implements ICredentialType {
	name = 'actionNetworkApi';
	displayName = 'Action Network API';
	documentationUrl = 'actionNetwork';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
