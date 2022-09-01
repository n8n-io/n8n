import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BluescapeLogin implements ICredentialType {
	name = 'bluescapeLogin';
	displayName = 'Bluescape Login for Access Token';
	documentationUrl = 'bluescape';
	properties: INodeProperties[] = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: 'my.bluescape.io',
			placeholder: 'n8n',
			description: 'The Bluescape domain.',
			required: true,
		},
		{
			displayName: 'Login email',
			name: 'login',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			typeOptions: {
				password: true,
			},
			type: 'string',
			default: '',
		},
	];
}
