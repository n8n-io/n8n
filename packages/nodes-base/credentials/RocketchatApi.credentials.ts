import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class RocketchatApi implements ICredentialType {
	name = 'rocketchatApi';
	displayName = 'Rocket API';
	documentationUrl = 'rocketchat';
	properties: INodeProperties[] = [
		{
			displayName: 'User Id',
			name: 'userId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth Key',
			name: 'authKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://n8n.rocket.chat',
		},
	];
}
