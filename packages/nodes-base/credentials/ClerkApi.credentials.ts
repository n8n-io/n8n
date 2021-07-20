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
			description: 'Secret to verify webhook signatures',
			placeholder: 'whsec_t6282haDhoSLqiamshd9X2deLWCmk3CA',
			default: '',
		},
	];
}
