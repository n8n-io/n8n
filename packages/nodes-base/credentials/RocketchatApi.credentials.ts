import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class RocketchatApi implements ICredentialType {
	name = 'rocketchatApi';
	displayName = 'Rocket API';
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
			displayName: 'Sub Domain',
			name: 'subdomain',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'n8n'
		},
	];
}
