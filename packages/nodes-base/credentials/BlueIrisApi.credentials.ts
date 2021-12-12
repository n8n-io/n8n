import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BlueIrisApi implements ICredentialType {
	name = 'blueIrisApi';
	displayName = 'BlueIris Api';
	documentationUrl = 'BlueIris';
	properties: INodeProperties[] = [
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
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
