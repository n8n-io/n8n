import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WhatsAppBotApi implements ICredentialType {
	name = 'whatsAppBotApi';

	displayName = 'WhatsApp Bot API';

	documentationUrl = 'whatsapp';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'System User access token from the WhatsApp > API Setup page of the Meta app',
		},
		{
			displayName: 'Phone Number ID',
			name: 'phoneNumberId',
			type: 'string',
			default: '',
			required: true,
			description: 'The bot phone number ID, from the WhatsApp > API Setup page of the Meta app',
		},
		{
			displayName: 'WhatsApp Business Account ID',
			name: 'businessAccountId',
			type: 'string',
			default: '',
			required: true,
			description: 'The WABA ID that owns the phone number, from the same API Setup page',
		},
		{
			displayName: 'App Secret',
			name: 'appSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'From App Settings > Basic in the Meta app. Used to verify inbound webhook signatures.',
		},
		{
			displayName: 'Webhook Verify Token',
			name: 'verifyToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'A secret you choose. Enter the same value as the Verify Token when you configure this webhook URL in the Meta app.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://graph.facebook.com/v21.0',
			url: '=/{{$credentials.phoneNumberId}}',
			ignoreHttpStatusErrors: true,
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'error.type',
					value: 'OAuthException',
					message: 'Invalid access token',
				},
			},
		],
	};
}
