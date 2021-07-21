import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ClerkApi implements ICredentialType {
	name = 'clerkApi';
	displayName = 'Clerk API';
	properties: INodeProperties[] = [
		{
			displayName: 'Webhook Secret',
			name: 'webhookSecret',
			type: 'string',
			description: 'Secret to verify webhook signatures. Access your Clerk instance dashboard, click on Integrations, select Svix, add an endpoint, click on the new endpoint, and find the secret under "Signing Secret".',
			placeholder: 'whsec_t6282haDhoSLqiamshd9X2deLWCmk3CA',
			default: '',
		},
	];
}
