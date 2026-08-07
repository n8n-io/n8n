import type { ILoadOptionsFunctions, INode, INodePropertyOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { ERPNext } from '../ERPNext.node';

const BASE_URL = 'https://erp.example.com';

/** Shape returned by `/api/resource/DocType/{docType}` — the version 1 endpoint. */
const RESOURCE_RESPONSE = {
	data: {
		fields: [
			{ label: 'Customer Name', fieldname: 'customer_name' },
			{ label: 'Territory', fieldname: 'territory' },
		],
	},
};

/**
 * Shape returned by `frappe.desk.form.load.getdoctype` — the version 1.1 endpoint.
 * It bundles the requested DocType with the DocTypes it links to.
 */
const GETDOCTYPE_RESPONSE = {
	docs: [
		{
			name: 'Customer',
			fields: [
				{ label: 'Customer Name', fieldname: 'customer_name' },
				{ label: 'Territory', fieldname: 'territory' },
				// Layout breaks carry no label and are dropped, as on version 1.
				{ label: '', fieldname: 'section_break_1' },
			],
		},
		{
			name: 'Customer Credit Limit',
			fields: [{ label: 'Credit Limit', fieldname: 'credit_limit' }],
		},
	],
};

const createContext = (typeVersion: number, docType: string, response: unknown) => {
	const ctx = mockDeep<ILoadOptionsFunctions>();

	ctx.getNode.mockReturnValue({ typeVersion } as INode);
	ctx.getCurrentNodeParameter.mockReturnValue(docType);
	ctx.getCredentials.mockResolvedValue({
		environment: 'selfHosted',
		domain: BASE_URL,
	});
	ctx.helpers.requestWithAuthentication.mockResolvedValue(response);

	return ctx;
};

/** The URI the node actually requested. */
const requestedUri = (ctx: ReturnType<typeof createContext>) =>
	ctx.helpers.requestWithAuthentication.mock.calls[0][1].uri;

describe('ERPNext node', () => {
	const node = new ERPNext();

	describe('loadOptions.getDocFields', () => {
		it('reads fields from the DocType resource on version 1', async () => {
			const ctx = createContext(1, 'Customer', RESOURCE_RESPONSE);

			const result = await node.methods.loadOptions.getDocFields.call(ctx);

			expect(requestedUri(ctx)).toBe(`${BASE_URL}/api/resource/DocType/Customer`);
			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'Customer Name', value: 'customer_name' },
				{ name: 'Territory', value: 'territory' },
			]);
		});

		it('reads fields from the desk form endpoint on version 1.1', async () => {
			const ctx = createContext(1.1, 'Customer', GETDOCTYPE_RESPONSE);

			const result = await node.methods.loadOptions.getDocFields.call(ctx);

			expect(requestedUri(ctx)).toBe(
				`${BASE_URL}/api/method/frappe.desk.form.load.getdoctype?doctype=Customer`,
			);
			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'Customer Name', value: 'customer_name' },
				{ name: 'Territory', value: 'territory' },
			]);
		});

		it('does not request the permission-restricted DocType resource on version 1.1', async () => {
			const ctx = createContext(1.1, 'Customer', GETDOCTYPE_RESPONSE);

			await node.methods.loadOptions.getDocFields.call(ctx);

			expect(requestedUri(ctx)).not.toContain('/api/resource/DocType/');
		});

		it('ignores fields belonging to linked DocTypes', async () => {
			const ctx = createContext(1.1, 'Customer', GETDOCTYPE_RESPONSE);

			const result = await node.methods.loadOptions.getDocFields.call(ctx);

			expect(result).not.toContainEqual({ name: 'Credit Limit', value: 'credit_limit' });
		});

		it('matches a URI-encoded DocType name against the decoded response', async () => {
			const ctx = createContext(1.1, 'Sales%20Order', {
				docs: [
					{ name: 'Sales Order Item', fields: [{ label: 'Rate', fieldname: 'rate' }] },
					{ name: 'Sales Order', fields: [{ label: 'Customer', fieldname: 'customer' }] },
				],
			});

			const result = await node.methods.loadOptions.getDocFields.call(ctx);

			expect(result).toEqual<INodePropertyOptions[]>([{ name: 'Customer', value: 'customer' }]);
		});

		it('falls back to the first document when no name matches', async () => {
			const ctx = createContext(1.1, 'Customer', {
				docs: [{ fields: [{ label: 'Territory', fieldname: 'territory' }] }],
			});

			const result = await node.methods.loadOptions.getDocFields.call(ctx);

			expect(result).toEqual<INodePropertyOptions[]>([{ name: 'Territory', value: 'territory' }]);
		});
	});

	describe('loadOptions.getDocFilters', () => {
		it('reads filters from the DocType resource on version 1', async () => {
			const ctx = createContext(1, 'Customer', RESOURCE_RESPONSE);

			const result = await node.methods.loadOptions.getDocFilters.call(ctx);

			expect(requestedUri(ctx)).toBe(`${BASE_URL}/api/resource/DocType/Customer`);
			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: '*', value: '*' },
				{ name: 'Customer Name', value: 'customer_name' },
				{ name: 'Territory', value: 'territory' },
			]);
		});

		it('reads filters from the desk form endpoint on version 1.1', async () => {
			const ctx = createContext(1.1, 'Customer', GETDOCTYPE_RESPONSE);

			const result = await node.methods.loadOptions.getDocFilters.call(ctx);

			expect(requestedUri(ctx)).toBe(
				`${BASE_URL}/api/method/frappe.desk.form.load.getdoctype?doctype=Customer`,
			);
			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: '*', value: '*' },
				{ name: 'Customer Name', value: 'customer_name' },
				{ name: 'Territory', value: 'territory' },
			]);
		});
	});

	describe('unexpected version 1.1 responses', () => {
		it.each([
			['no docs property', {}],
			['docs is not an array', { docs: 'nope' }],
			['docs is empty', { docs: [] }],
			['document has no fields array', { docs: [{ name: 'Customer' }] }],
			['response is null', null],
		])('returns no options when %s', async (_label, response) => {
			const ctx = createContext(1.1, 'Customer', response);

			const result = await node.methods.loadOptions.getDocFields.call(ctx);

			expect(result).toEqual([]);
		});

		it('skips malformed field entries', async () => {
			const ctx = createContext(1.1, 'Customer', {
				docs: [
					{
						name: 'Customer',
						fields: [
							null,
							'not an object',
							{ fieldname: 'no_label' },
							{ label: 'No fieldname' },
							{ label: 'Territory', fieldname: 'territory' },
						],
					},
				],
			});

			const result = await node.methods.loadOptions.getDocFields.call(ctx);

			expect(result).toEqual<INodePropertyOptions[]>([{ name: 'Territory', value: 'territory' }]);
		});
	});
});
