import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Eloqua implements ICredentialType {
	name = 'eloqua';
	displayName = 'Oracle Eloqua';
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
			default: '',
		},
	];
}
