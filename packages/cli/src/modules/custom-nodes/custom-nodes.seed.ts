import type { CustomNodeDefinition, CustomOperationDefinition } from '@n8n/api-types';

/**
 * Demo data created on first run when the mockup flag is on: one Custom
 * Operation attached to the built-in Stripe node, and one standalone Custom
 * Node ("Acme Billing") with two operations and an uploaded SVG logo.
 */

const ACME_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1F2A44"/>
  <path d="M18 44 32 18l14 26h-7.2l-6.8-13.4L25.2 44z" fill="#FF6D5A"/>
  <rect x="22" y="47" width="20" height="4" rx="2" fill="#FFFFFF"/>
</svg>`;

const now = () => new Date().toISOString();

export const STRIPE_PAYMENT_LINK_ID = 'seedStripePaymentLink';
export const ACME_BILLING_NODE_ID = 'seedAcmeBilling';
export const ACME_CREATE_INVOICE_ID = 'seedAcmeCreateInvoice';
export const ACME_GET_INVOICE_ID = 'seedAcmeGetInvoice';

export function seedStripePaymentLink(): CustomOperationDefinition {
	return {
		id: STRIPE_PAYMENT_LINK_ID,
		name: 'Create Payment Link',
		description: 'Create a Stripe Payment Link for a single price. Custom operation.',
		parentNodeType: 'n8n-nodes-base.stripe',
		customNodeId: null,
		activeVersion: 1,
		versions: [
			{
				version: 1,
				createdAt: now(),
				changelog: 'Initial version',
				request: {
					method: 'POST',
					url: 'https://api.stripe.com/v1/payment_links',
					headers: {},
					query: {},
					bodyType: 'form',
					auth: { kind: 'predefined', credentialType: 'stripeApi' },
				},
				fixedData: [
					{ target: 'body', key: 'line_items[0].adjustable_quantity.enabled', value: 'false' },
				],
				inputs: [
					{
						name: 'price',
						displayName: 'Price ID',
						description: 'ID of the Stripe Price to sell, e.g. price_1Nx...',
						type: 'string',
						required: true,
						default: '',
						target: 'body',
						key: 'line_items[0].price',
					},
					{
						name: 'quantity',
						displayName: 'Quantity',
						type: 'number',
						required: true,
						default: 1,
						target: 'body',
						key: 'line_items[0].quantity',
					},
					{
						name: 'afterCompletionType',
						displayName: 'After Completion',
						description: 'What happens after a successful payment',
						type: 'options',
						options: [
							{ name: 'Hosted Confirmation', value: 'hosted_confirmation' },
							{ name: 'Redirect', value: 'redirect' },
						],
						required: false,
						default: 'hosted_confirmation',
						target: 'body',
						key: 'after_completion.type',
					},
					{
						name: 'redirectUrl',
						displayName: 'Redirect URL',
						description: 'Only used when After Completion is Redirect',
						type: 'string',
						required: false,
						default: '',
						target: 'body',
						key: 'after_completion.redirect.url',
					},
					{
						name: 'allowPromotionCodes',
						displayName: 'Allow Promotion Codes',
						type: 'boolean',
						required: false,
						default: false,
						target: 'body',
						key: 'allow_promotion_codes',
					},
				],
			},
		],
	};
}

export function seedAcmeBillingNode(): CustomNodeDefinition {
	return {
		id: ACME_BILLING_NODE_ID,
		name: 'acmeBilling',
		displayName: 'Acme Billing',
		description: 'Custom node for the Acme Billing API',
		iconDataUri: `data:image/svg+xml;base64,${Buffer.from(ACME_LOGO_SVG).toString('base64')}`,
		baseUrl: 'https://billing.acme.example/api/v2',
		auth: { kind: 'generic', type: 'httpHeaderAuth' },
		operationIds: [ACME_CREATE_INVOICE_ID, ACME_GET_INVOICE_ID],
	};
}

export function seedAcmeOperations(): CustomOperationDefinition[] {
	const auth = { kind: 'generic', type: 'httpHeaderAuth' } as const;
	return [
		{
			id: ACME_CREATE_INVOICE_ID,
			name: 'Create Invoice',
			description: 'Create a draft invoice for a customer',
			parentNodeType: null,
			customNodeId: ACME_BILLING_NODE_ID,
			activeVersion: 1,
			versions: [
				{
					version: 1,
					createdAt: now(),
					request: {
						method: 'POST',
						url: '/invoices',
						headers: {},
						query: {},
						bodyType: 'json',
						body: '{ "source": "n8n" }',
						auth,
					},
					fixedData: [],
					inputs: [
						{
							name: 'customerId',
							displayName: 'Customer ID',
							type: 'string',
							required: true,
							default: '',
							target: 'body',
							key: 'customer_id',
						},
						{
							name: 'amount',
							displayName: 'Amount (cents)',
							type: 'number',
							required: true,
							default: 0,
							target: 'body',
							key: 'amount',
						},
						{
							name: 'currency',
							displayName: 'Currency',
							type: 'options',
							options: [
								{ name: 'EUR', value: 'eur' },
								{ name: 'USD', value: 'usd' },
							],
							required: false,
							default: 'eur',
							target: 'body',
							key: 'currency',
						},
						{
							name: 'memo',
							displayName: 'Memo',
							type: 'string',
							required: false,
							default: '',
							target: 'body',
							key: 'memo',
						},
					],
				},
			],
		},
		{
			id: ACME_GET_INVOICE_ID,
			name: 'Get Invoice',
			description: 'Fetch one invoice by ID',
			parentNodeType: null,
			customNodeId: ACME_BILLING_NODE_ID,
			activeVersion: 1,
			versions: [
				{
					version: 1,
					createdAt: now(),
					request: {
						method: 'GET',
						url: '/invoices/{{ $parameter.invoiceId }}',
						headers: {},
						query: {},
						bodyType: 'none',
						auth,
					},
					fixedData: [{ target: 'query', key: 'expand', value: 'customer' }],
					inputs: [
						{
							name: 'invoiceId',
							displayName: 'Invoice ID',
							type: 'string',
							required: true,
							default: '',
							target: 'url',
							key: 'invoiceId',
						},
						{
							name: 'includeLines',
							displayName: 'Include Line Items',
							type: 'boolean',
							required: false,
							default: false,
							target: 'query',
							key: 'include_lines',
						},
					],
				},
			],
		},
	];
}
