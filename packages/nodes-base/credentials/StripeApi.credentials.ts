import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StripeApi implements ICredentialType {
	name = 'stripeApi';

	displayName = 'Stripe API';

	documentationUrl = 'stripe';

	properties: INodeProperties[] = [
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Signature Secret',
			name: 'signatureSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'The signature secret is used to verify the authenticity of requests sent by Stripe.',
		},
		{
			displayName:
				'We strongly recommend setting up a <a href="https://stripe.com/docs/webhooks" target="_blank">signing secret</a> to ensure the authenticity of requests.',
			name: 'notice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					signatureSecret: [''],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.secretKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.stripe.com/v1',
			url: '/charges',
			json: true,
		},
	};
}
