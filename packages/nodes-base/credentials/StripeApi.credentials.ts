import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class StripeApi implements ICredentialType {
	name = 'stripeApi';
	displayName = 'Stripe Api';
	documentationUrl = 'stripe';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
