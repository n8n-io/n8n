import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class RocketchatApi implements ICredentialType {
	name = 'rocketchatApi';
	displayName = 'Rocket API';
	documentationUrl = 'rocketchat';
	properties = [
		{
			displayName: 'User Id',
			name: 'userId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth Key',
			name: 'authKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://n8n.rocket.chat',
		},
	];
}
