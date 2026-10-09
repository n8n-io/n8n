import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class ContactsApi implements ICredentialType {
	name = 'contactsApi';

	displayName = 'Contacts API';

	icon: Icon = 'file:../nodes/Contacts/contacts.svg';

	documentationUrl = 'https://example.com/n8n-nodes-contacts#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Contacts-Token': '={{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: { baseURL: 'http://127.0.0.1:18090/contacts/v1', url: '/contacts' },
	};
}
