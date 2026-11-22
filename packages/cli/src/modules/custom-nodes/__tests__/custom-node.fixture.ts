import type { ActionVersionView, ActionView, CustomNodeView } from '../node-description.generator';

/** A custom node with two actions. `Create Invoice` has two versions. */
export const node: CustomNodeView = {
	id: 'cn_acme',
	displayName: 'Acme Billing',
	description: 'Invoices in Acme Billing',
	baseUrl: 'https://billing.acme.test/api',
	auth: { kind: 'generic', type: 'httpHeaderAuth' },
};

export const getInvoice: ActionView = {
	id: 'act_get',
	name: 'Get Invoice',
	description: 'Reads one invoice',
	versions: [
		{
			version: 1,
			inputs: [
				{ name: 'invoiceId', displayName: 'Invoice ID', type: 'string', required: true },
				{
					name: 'includeLines',
					displayName: 'Include Lines',
					type: 'boolean',
					required: false,
					default: false,
				},
			],
			request: {
				method: 'GET',
				url: '/invoices/{invoiceId}',
				headers: {},
				query: { expand: 'customer' },
				bodyType: 'none',
				body: {},
				inputTargets: {
					invoiceId: { target: 'url', key: 'invoiceId' },
					includeLines: { target: 'query', key: 'include_lines' },
				},
			},
		},
	],
};

export const createV1: ActionVersionView = {
	version: 1,
	inputs: [
		{ name: 'amount', displayName: 'Amount', type: 'number', required: true },
		{ name: 'customerId', displayName: 'Customer ID', type: 'string', required: true },
	],
	request: {
		method: 'POST',
		url: '/invoices',
		headers: { 'X-Api-Version': '1' },
		query: {},
		bodyType: 'json',
		body: { source: 'n8n', meta: { channel: 'api', tags: ['a', 'b'] } },
		inputTargets: {
			amount: { target: 'body', key: 'amount' },
			customerId: { target: 'body', key: 'customer.id' },
		},
	},
};

export const createV2: ActionVersionView = {
	version: 2,
	inputs: [
		{ name: 'amount', displayName: 'Amount', type: 'number', required: true },
		{
			name: 'currency',
			displayName: 'Currency',
			type: 'options',
			options: [
				{ name: 'Euro', value: 'eur' },
				{ name: 'Dollar', value: 'usd' },
			],
			required: false,
			default: 'eur',
		},
		{ name: 'lineItems0Price', displayName: 'First Line Price', type: 'number', required: false },
		{ name: 'metadata', displayName: 'Metadata', type: 'json', required: false },
		{ name: 'idempotencyKey', displayName: 'Idempotency Key', type: 'string', required: false },
	],
	request: {
		method: 'POST',
		url: '/v2/invoices',
		headers: { 'X-Api-Version': '2' },
		query: {},
		bodyType: 'json',
		body: {},
		inputTargets: {
			amount: { target: 'body', key: 'amount' },
			currency: { target: 'body', key: 'currency' },
			lineItems0Price: { target: 'body', key: 'line_items[0].price' },
			metadata: { target: 'body', key: 'metadata' },
			idempotencyKey: { target: 'header', key: 'Idempotency-Key' },
		},
	},
};

export const createInvoice: ActionView = {
	id: 'act_create',
	name: 'Create Invoice',
	versions: [createV1, createV2],
};
