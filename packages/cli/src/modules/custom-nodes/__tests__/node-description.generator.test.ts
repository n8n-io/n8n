import type { CustomNodeDefinition, CustomOperationDefinition } from '@n8n/api-types';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	ADDITIONAL_FIELDS_NAME,
	CUSTOM_RESOURCE_VALUE,
	generateCustomNodeDescription,
	generateOperationNodeDescriptions,
	generateRuntimeDescription,
	injectOperationsIntoParent,
	templateToExpression,
} from '../node-description.generator';

const paymentLink = (): CustomOperationDefinition => ({
	id: 'op1',
	name: 'Create Payment Link',
	parentNodeType: 'n8n-nodes-base.stripe',
	customNodeId: null,
	activeVersion: 1,
	versions: [
		{
			version: 1,
			createdAt: '2026-09-18T00:00:00.000Z',
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
					type: 'string',
					required: true,
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
					name: 'afterCompletion',
					displayName: 'After Completion',
					type: 'options',
					options: [
						{ name: 'Hosted confirmation', value: 'hosted_confirmation' },
						{ name: 'Redirect', value: 'redirect' },
					],
					required: false,
					target: 'body',
					key: 'after_completion.type',
				},
			],
		},
		{
			version: 2,
			createdAt: '2026-09-19T00:00:00.000Z',
			changelog: 'Adds idempotency header',
			request: {
				method: 'POST',
				url: 'https://api.stripe.com/v1/payment_links',
				headers: { 'Idempotency-Key': '{{ $parameter.idempotencyKey }}' },
				query: {},
				bodyType: 'form',
				auth: { kind: 'predefined', credentialType: 'stripeApi' },
			},
			fixedData: [],
			inputs: [
				{
					name: 'idempotencyKey',
					displayName: 'Idempotency Key',
					type: 'string',
					required: false,
					target: 'url',
					key: 'idempotencyKey',
				},
			],
		},
	],
});

describe('node-description.generator', () => {
	describe('generateOperationNodeDescriptions', () => {
		it('generates one hidden declarative description per version with the parent icon', () => {
			const descriptions = generateOperationNodeDescriptions(paymentLink(), {
				parent: {
					displayName: 'Stripe',
					iconUrl: 'icons/n8n-nodes-base/dist/nodes/Stripe/stripe.svg',
					group: ['transform'],
				},
			});

			expect(descriptions).toHaveLength(2);
			const [v1, v2] = descriptions;

			expect(v1.name).toBe('op1');
			expect(v1.version).toBe(1);
			expect(v1.defaultVersion).toBe(1);
			expect(v1.hidden).toBe(true);
			expect(v1.displayName).toBe('Stripe: Create Payment Link');
			expect(v1.iconUrl).toBe('icons/n8n-nodes-base/dist/nodes/Stripe/stripe.svg');
			expect(v1.credentials).toEqual([{ name: 'stripeApi', required: true }]);
			expect(v1.customDefinition).toEqual({
				definitionId: 'op1',
				parentNodeType: 'n8n-nodes-base.stripe',
				customNodeId: null,
			});

			// Fixed request data lives in requestDefaults so RoutingNode applies it
			expect(v1.requestDefaults).toEqual({
				method: 'POST',
				url: 'https://api.stripe.com/v1/payment_links',
				json: true,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: { line_items: [{ adjustable_quantity: { enabled: 'false' } }] },
			});

			// Required inputs are top-level parameters with body routing
			expect(v1.properties.map((p) => p.name)).toEqual([
				'price',
				'quantity',
				ADDITIONAL_FIELDS_NAME,
			]);
			expect(v1.properties[0].routing).toEqual({
				send: { type: 'body', property: 'line_items[0].price', value: '={{ $value }}' },
			});
			expect(v1.properties[1].default).toBe(1);

			// Optional inputs are inside the Additional Fields collection
			const additionalFields = v1.properties[2];
			expect(additionalFields.type).toBe('collection');
			expect(additionalFields.options?.[0]).toMatchObject({
				name: 'afterCompletion',
				type: 'options',
				default: 'hosted_confirmation',
				routing: {
					send: { type: 'body', property: 'after_completion.type', value: '={{ $value }}' },
				},
			});

			// v2 rewrites placeholders to the real parameter path
			expect(v2.version).toBe(2);
			expect(v2.requestDefaults?.headers).toEqual({
				'Content-Type': 'application/x-www-form-urlencoded',
				'Idempotency-Key': '={{ ($parameter["additionalFields"]?.["idempotencyKey"] ?? "") }}',
			});
		});
	});

	describe('generateCustomNodeDescription', () => {
		it('bundles operations as an operation parameter with per-option routing', () => {
			const node: CustomNodeDefinition = {
				id: 'node1',
				name: 'acmeBilling',
				displayName: 'Acme Billing',
				baseUrl: 'https://billing.acme.test/api',
				auth: { kind: 'generic', type: 'httpHeaderAuth' },
				operationIds: ['opA', 'opB'],
			};
			const opA: CustomOperationDefinition = {
				id: 'opA',
				name: 'Get Invoice',
				parentNodeType: null,
				customNodeId: 'node1',
				activeVersion: 1,
				versions: [
					{
						version: 1,
						createdAt: '2026-09-18T00:00:00.000Z',
						request: {
							method: 'GET',
							url: '/invoices/{{ $parameter.invoiceId }}',
							headers: {},
							query: { expand: 'customer' },
							bodyType: 'none',
							auth: { kind: 'generic', type: 'httpHeaderAuth' },
						},
						fixedData: [],
						inputs: [
							{
								name: 'invoiceId',
								displayName: 'Invoice ID',
								type: 'string',
								required: true,
								target: 'url',
								key: 'invoiceId',
							},
						],
					},
				],
			};
			const opB: CustomOperationDefinition = {
				...opA,
				id: 'opB',
				name: 'Create Invoice',
				versions: [
					{
						...opA.versions[0],
						request: {
							...opA.versions[0].request,
							method: 'POST',
							url: '/invoices',
							bodyType: 'json',
						},
						inputs: [
							{
								name: 'amount',
								displayName: 'Amount',
								type: 'number',
								required: true,
								target: 'body',
								key: 'amount',
							},
						],
					},
				],
			};

			const description = generateCustomNodeDescription(node, [opA, opB], {
				iconUrl: 'rest/custom-nodes/node1/icon',
			});

			expect(description.name).toBe('node1');
			expect(description.hidden).toBeUndefined();
			expect(description.iconUrl).toBe('rest/custom-nodes/node1/icon');
			expect(description.requestDefaults).toEqual({
				baseURL: 'https://billing.acme.test/api',
				json: true,
			});
			expect(description.credentials).toEqual([{ name: 'httpHeaderAuth', required: true }]);

			const [operation, invoiceId, amount] = description.properties;
			expect(operation.name).toBe('operation');
			expect(operation.default).toBe('opA');
			expect(operation.options).toHaveLength(2);
			expect(operation.options?.[0]).toMatchObject({
				value: 'opA',
				action: 'Get Invoice',
				routing: {
					request: {
						method: 'GET',
						url: '=/invoices/{{ $parameter["invoiceId"] }}',
						qs: { expand: 'customer' },
					},
				},
			});

			expect(invoiceId.displayOptions).toEqual({ show: { operation: ['opA'] } });
			expect(invoiceId.routing).toBeUndefined();
			expect(amount.displayOptions).toEqual({ show: { operation: ['opB'] } });
			expect(amount.routing).toEqual({
				send: { type: 'body', property: 'amount', value: '={{ $value }}' },
			});
		});
	});

	describe('templateToExpression', () => {
		it('leaves plain strings alone and rewrites placeholders', () => {
			expect(templateToExpression('https://x.test/a', {})).toBe('https://x.test/a');
			expect(
				templateToExpression('https://x.test/{{ $parameter.id }}', { id: '$parameter["id"]' }),
			).toBe('=https://x.test/{{ $parameter["id"] }}');
		});
	});
});

describe('injectOperationsIntoParent', () => {
	it('adds a Custom Operation resource with the operations and their inputs to a resource/operation node', () => {
		const stripeLike: INodeTypeDescription = {
			displayName: 'Stripe',
			name: 'n8n-nodes-base.stripe',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Stripe' },
			inputs: ['main'],
			outputs: ['main'],
			credentials: [{ name: 'stripeApi', required: true }],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'charge',
					options: [{ name: 'Charge', value: 'charge' }],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'create',
					displayOptions: { show: { resource: ['charge'] } },
					options: [{ name: 'Create', value: 'create' }],
				},
			],
		};

		const injected = injectOperationsIntoParent(stripeLike, [paymentLink()]);

		// input untouched
		expect(stripeLike.properties).toHaveLength(2);

		const [resource, customOperation, chargeOperation, ...inputs] = injected.properties;
		expect(resource.options).toEqual([
			{ name: 'Charge', value: 'charge' },
			expect.objectContaining({ name: 'Custom', value: CUSTOM_RESOURCE_VALUE }),
		]);
		expect(chargeOperation.displayOptions).toEqual({ show: { resource: ['charge'] } });
		expect(customOperation).toMatchObject({
			name: 'operation',
			default: 'op1',
			displayOptions: { show: { resource: [CUSTOM_RESOURCE_VALUE] } },
			options: [{ name: 'Create Payment Link', value: 'op1', action: 'Create Payment Link' }],
		});
		expect(inputs.map((p) => p.name)).toEqual(['price', 'quantity', ADDITIONAL_FIELDS_NAME]);
		expect(inputs[0].displayOptions).toEqual({
			show: { resource: [CUSTOM_RESOURCE_VALUE], operation: ['op1'] },
		});
	});

	it('generates a runtime description that borrows the parent credentials', () => {
		const parent: INodeTypeDescription = {
			displayName: 'Stripe',
			name: 'n8n-nodes-base.stripe',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Stripe' },
			inputs: ['main'],
			outputs: ['main'],
			credentials: [{ name: 'stripeApi', required: true }],
			properties: [],
		};
		const runtime = generateRuntimeDescription(paymentLink(), parent);
		expect(runtime.credentials).toEqual([{ name: 'stripeApi', required: true }]);
		expect(runtime.requestDefaults?.url).toBe('https://api.stripe.com/v1/payment_links');
		expect(runtime.properties.map((p) => p.name)).toEqual([
			'price',
			'quantity',
			ADDITIONAL_FIELDS_NAME,
		]);
	});
});
