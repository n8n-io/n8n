import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class GristApi implements ICredentialType {
	name = 'gristApi';
	displayName = 'Grist API';
	documentationUrl = 'grist';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
