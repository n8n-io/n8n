import { mockDeep } from 'vitest-mock-extended';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';

import { ERPNext } from '../ERPNext.node';

/**
 * The Field and Filter dropdowns used to read `/api/resource/DocType/<name>`,
 * which needs read access to the `DocType` doctype. A default Frappe install
 * gives that to System Manager only, so every other user saw an empty dropdown
 * and `DocType unavailable.` (#35796). They now read the definitions the way the
 * desk UI does.
 */
describe('ERPNext node', () => {
	let node: ERPNext;
	let loadOptionsFunctions: Mocked<ILoadOptionsFunctions>;
	// `mockDeep` types the helper as the plain function it wraps.
	let request: Mock;

	const getdoctype = '/api/method/frappe.desk.form.load.getdoctype';

	// One entry for each doctype of the bundle: the requested one, then the
	// child tables it uses. Only the first one holds the fields we want.
	const metaBundle = {
		docs: [
			{
				name: 'Customer',
				fields: [
					{ label: 'Customer Name', fieldname: 'customer_name' },
					{ label: 'Territory', fieldname: 'territory' },
				],
			},
			{
				name: 'Customer Credit Limit',
				fields: [{ label: 'Credit Limit', fieldname: 'credit_limit' }],
			},
		],
	};

	const respondWith = (response: unknown) => request.mockResolvedValue(response);

	const requestOptions = () =>
		request.mock.calls[0][1] as { uri: string; qs?: { doctype?: string } };

	beforeEach(() => {
		node = new ERPNext();
		loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		loadOptionsFunctions.getCredentials.mockResolvedValue({
			environment: 'selfHosted',
			domain: 'https://erp.example.com',
		});
		loadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('Customer');
		request = loadOptionsFunctions.helpers.requestWithAuthentication as unknown as Mock;
		vi.clearAllMocks();
	});

	afterEach(() => vi.resetAllMocks());

	describe('loadOptions.getDocFields', () => {
		it('reads the fields through getdoctype rather than the DocType record', async () => {
			respondWith(metaBundle);

			const result = await node.methods.loadOptions.getDocFields.call(loadOptionsFunctions);

			expect(requestOptions().uri).toBe(`https://erp.example.com${getdoctype}`);
			expect(requestOptions().qs).toEqual({ doctype: 'Customer' });
			// Exactly these: the child table's `credit_limit` is in the bundle too,
			// and taking the wrong entry would offer it.
			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'Customer Name', value: 'customer_name' },
				{ name: 'Territory', value: 'territory' },
			]);
		});

		it('sends the decoded doctype name, because the query string encodes again', async () => {
			loadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('Sales%20Order');
			respondWith({ docs: [{ fields: [] }] });

			await node.methods.loadOptions.getDocFields.call(loadOptionsFunctions);

			expect(requestOptions().qs).toEqual({ doctype: 'Sales Order' });
		});

		it('returns no options when the response carries no doctype', async () => {
			respondWith({ docs: [] });

			const result = await node.methods.loadOptions.getDocFields.call(loadOptionsFunctions);

			expect(result).toEqual([]);
		});
	});

	describe('loadOptions.getDocFilters', () => {
		it('offers the same fields plus the * wildcard', async () => {
			respondWith(metaBundle);

			const result = await node.methods.loadOptions.getDocFilters.call(loadOptionsFunctions);

			expect(requestOptions().uri).toBe(`https://erp.example.com${getdoctype}`);
			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: '*', value: '*' },
				{ name: 'Customer Name', value: 'customer_name' },
				{ name: 'Territory', value: 'territory' },
			]);
		});
	});

	describe('loadOptions.getDocTypes', () => {
		it('still reads the DocType list, which needs no extra role', async () => {
			request
				.mockResolvedValueOnce({ data: [{ name: 'Customer' }, { name: 'Sales Order' }] })
				.mockResolvedValueOnce({ data: [] });

			const result = await node.methods.loadOptions.getDocTypes.call(loadOptionsFunctions);

			expect(requestOptions().uri).toBe('https://erp.example.com/api/resource/DocType');
			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'Customer', value: 'Customer' },
				{ name: 'Sales Order', value: 'Sales%20Order' },
			]);
		});
	});
});
