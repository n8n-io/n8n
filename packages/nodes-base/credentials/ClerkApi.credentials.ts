import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ClerkApi implements ICredentialType {
	name = 'clerkApi';
	displayName = 'Webhook Secret';
	properties: INodeProperties[] = [
		{
			displayName: 'Webhook Secret',
			name: 'webhookSecret',
			type: 'string',
			placeholder: 'Find it under Clerk → Integrations → Svix',
			default: '',
		},
	];
}
