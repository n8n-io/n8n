import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PaddleApi implements ICredentialType {
	name = 'paddleApi';

	displayName = 'Paddle Classic API';

	documentationUrl = 'paddle';

	properties: INodeProperties[] = [
		{
			displayName:
				'These credentials only work with Paddle Classic. If you use Paddle Billing, use the Paddle Billing node and its credentials instead.',
			name: 'paddleBillingNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Vendor Auth Code',
			name: 'vendorAuthCode',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Vendor ID',
			name: 'vendorId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Use Sandbox Environment API',
			name: 'sandbox',
			type: 'boolean',
			default: false,
		},
	];
}
