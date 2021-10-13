import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EloquaApi implements ICredentialType {
	name = 'eloquaApi';
	displayName = 'Oracle Eloqua API';
	documentationUrl = 'eloqua';
	properties: INodeProperties[] = [
		{
			displayName: 'Company Name',
			name: 'companyName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'User Name',
			name: 'userName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
