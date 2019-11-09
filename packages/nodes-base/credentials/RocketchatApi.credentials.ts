import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class RocketchatApi implements ICredentialType {
	name = 'rocketchatApi';
	displayName = 'Rocket API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
