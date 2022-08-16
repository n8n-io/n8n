import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class YepCodeApi implements ICredentialType {
	name = 'yepCodeApi';
	displayName = 'YepCode';
	documentationUrl = 'yepCode';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
		},
	];
}
