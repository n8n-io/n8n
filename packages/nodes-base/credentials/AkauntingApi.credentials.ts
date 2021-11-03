import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class AkauntingApi implements ICredentialType {
	name = 'akauntingApi';
	displayName = 'Akaunting API';
	documentationUrl = 'Akaunting';
	properties: INodeProperties[] = [
		{
			displayName: 'URL Akaunting',
			name: 'url',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Company Id',
			name: 'company_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
		},
	];
}
