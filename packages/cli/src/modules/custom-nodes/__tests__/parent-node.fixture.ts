import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { ActionView } from '../node-description.generator';

/** A programmatic parent with `resource` and `operation` and one credential. */
export const resourceParent: INodeTypeDescription = {
	displayName: 'Acme Billing',
	name: 'acmeBilling',
	icon: 'fa:file-invoice',
	group: ['transform'],
	version: 1,
	description: 'Invoices in Acme Billing',
	defaults: { name: 'Acme Billing' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [{ name: 'acmeBillingApi', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Invoice', value: 'invoice' },
				{ name: 'Customer', value: 'customer' },
			],
			default: 'invoice',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['invoice'] } },
			options: [
				{ name: 'Get', value: 'get', action: 'Get an invoice' },
				{ name: 'Create', value: 'create', action: 'Create an invoice' },
			],
			default: 'get',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['customer'] } },
			options: [{ name: 'Get', value: 'get', action: 'Get a customer' }],
			default: 'get',
		},
		{
			displayName: 'Invoice ID',
			name: 'invoiceId',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { resource: ['invoice'], operation: ['get'] } },
		},
	],
};

/** A parent with only `operation`. The `authentication` parameter selects one of two credentials. */
export const operationParent: INodeTypeDescription = {
	displayName: 'Acme Ledger',
	name: 'acmeLedger',
	icon: 'fa:book',
	group: ['transform'],
	version: [1, 2],
	description: 'Ledger entries in Acme Billing',
	defaults: { name: 'Acme Ledger' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'acmeLedgerApi',
			required: true,
			displayOptions: { show: { authentication: ['apiKey'] } },
		},
		{
			name: 'acmeLedgerOAuth2Api',
			required: true,
			displayOptions: { show: { authentication: ['oAuth2'] } },
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'API Key', value: 'apiKey' },
				{ name: 'OAuth2', value: 'oAuth2' },
			],
			default: 'apiKey',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Get Entry', value: 'get', action: 'Get an entry' },
				{ name: 'Export', value: 'export', action: 'Export the ledger' },
			],
			default: 'get',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
		},
		{
			displayName: 'Entry ID',
			name: 'entryId',
			type: 'string',
			default: '',
			displayOptions: { show: { operation: ['get'] } },
		},
	],
};

/** A declarative parent with a base URL and a `Custom API Call` option at the end of `resource`. */
export const declarativeParent: INodeTypeDescription = {
	displayName: 'Acme Payments',
	name: 'acmePayments',
	icon: 'fa:credit-card',
	group: ['transform'],
	version: 1,
	description: 'Payments in Acme Billing',
	defaults: { name: 'Acme Payments' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{ name: 'acmePaymentsApi', required: true, displayOptions: { show: { '@version': [1] } } },
	],
	requestDefaults: { baseURL: 'https://api.acme.test/v1', json: true },
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Payment', value: 'payment' },
				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
			],
			default: 'payment',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['payment'] } },
			options: [
				{
					name: 'Get Many',
					value: 'getAll',
					action: 'Get many payments',
					routing: { request: { method: 'GET', url: '/payments' } },
				},
			],
			default: 'getAll',
		},
	],
};

/** Two versions. Version 2 adds optional inputs. */
export const refundPayment: ActionView = {
	id: 'act_refund',
	name: 'Refund Payment',
	description: 'Refunds one payment',
	versions: [
		{
			version: 1,
			inputs: [{ name: 'paymentId', displayName: 'Payment ID', type: 'string', required: true }],
			request: {
				method: 'POST',
				url: 'https://api.acme.test/v1/payments/{paymentId}/refund',
				headers: {},
				query: {},
				bodyType: 'none',
				body: {},
				inputTargets: { paymentId: { target: 'url', key: 'paymentId' } },
			},
		},
		{
			version: 2,
			inputs: [
				{ name: 'paymentId', displayName: 'Payment ID', type: 'string', required: true },
				{ name: 'reason', displayName: 'Reason', type: 'string', required: false },
			],
			request: {
				method: 'POST',
				url: 'https://api.acme.test/v2/payments/{paymentId}/refunds',
				headers: {},
				query: {},
				bodyType: 'json',
				body: { source: 'n8n' },
				inputTargets: {
					paymentId: { target: 'url', key: 'paymentId' },
					reason: { target: 'body', key: 'reason' },
				},
			},
		},
	],
};

/** One version. The required input `limit` has the name of a parameter of `operationParent`. */
export const listPayouts: ActionView = {
	id: 'act_payouts',
	name: 'List Payouts',
	versions: [
		{
			version: 1,
			inputs: [{ name: 'limit', displayName: 'Limit', type: 'number', required: true }],
			request: {
				method: 'GET',
				url: 'https://api.acme.test/v1/payouts',
				headers: {},
				query: {},
				bodyType: 'none',
				body: {},
				inputTargets: { limit: { target: 'query', key: 'limit' } },
			},
		},
	],
};
