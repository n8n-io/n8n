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
			displayName: 'Api Version',
			name: 'apiVersion',
			type: 'string',
			placeholder: '2025-05-28.basil',
			default: '',
			description:
				'The API version to use for requests. If empty, stripe will use the default API version set in your account. When using this credential for a trigger node, Stripe needs to know the explicit version to be used, otherwise it will use the latest version which may not be compatible with the webhook payloads. You can find your API versions in your Stripe dashboard under Developers > Overview > API version.',
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
