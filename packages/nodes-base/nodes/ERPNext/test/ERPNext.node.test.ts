import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
} from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { ERPNext } from '../ERPNext.node';
import * as GenericFunctions from '../GenericFunctions';

describe('ERPNext > document: getAll', () => {
	let node: ERPNext;
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	const mockParameters = (options: IDataObject | ((itemIndex: number) => IDataObject)) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter, itemIndex) => {
			switch (parameter) {
				case 'resource':
					return 'document';
				case 'operation':
					return 'getAll';
				case 'docType':
					return 'Customer';
				case 'options':
					return typeof options === 'function' ? options(itemIndex) : options;
				case 'returnAll':
					return false;
				case 'limit':
					return 10;
				default:
					return undefined;
			}
		});
	};

	beforeEach(() => {
		node = new ERPNext();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		(mockExecuteFunctions.helpers.returnJsonArray as Mock).mockImplementation(
			(data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		(mockExecuteFunctions.helpers.constructExecutionMetaData as Mock).mockImplementation(
			(data: INodeExecutionData[]) => data,
		);
		vi.spyOn(GenericFunctions, 'erpNextApiRequest').mockResolvedValue({
			data: [{ name: 'Customer A' }],
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should not send filters when the Filters collection is left empty', async () => {
		mockParameters({ fields: ['name'], filters: {} });

		const result = await node.execute.call(mockExecuteFunctions);

		expect(result[0]).toEqual([{ json: { name: 'Customer A' } }]);
		expect(GenericFunctions.erpNextApiRequest).toHaveBeenCalledWith(
			'GET',
			'/api/resource/Customer',
			{},
			{ fields: JSON.stringify(['name']), limit_page_length: 10, limit_start: 0 },
		);
	});

	it('should not send fields or filters when both collections are left empty', async () => {
		mockParameters({ fields: [], filters: { customProperty: [] } });

		await node.execute.call(mockExecuteFunctions);

		expect(GenericFunctions.erpNextApiRequest).toHaveBeenCalledWith(
			'GET',
			'/api/resource/Customer',
			{},
			{ limit_page_length: 10, limit_start: 0 },
		);
	});

	it('should not carry query options over from a previous item', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockParameters((itemIndex) => (itemIndex === 0 ? { fields: ['name'] } : {}));

		await node.execute.call(mockExecuteFunctions);

		expect(GenericFunctions.erpNextApiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/api/resource/Customer',
			{},
			{ fields: JSON.stringify(['name']), limit_page_length: 10, limit_start: 0 },
		);
		expect(GenericFunctions.erpNextApiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/api/resource/Customer',
			{},
			{ limit_page_length: 10, limit_start: 0 },
		);
	});

	it('should not carry filters over from a previous item', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockParameters((itemIndex) =>
			itemIndex === 0
				? { filters: { customProperty: [{ field: 'first_name', operator: 'is', value: 'Jane' }] } }
				: {},
		);

		await node.execute.call(mockExecuteFunctions);

		expect(GenericFunctions.erpNextApiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/api/resource/Customer',
			{},
			{ limit_page_length: 10, limit_start: 0 },
		);
	});

	it('should send filters when the Filters collection has entries', async () => {
		mockParameters({
			filters: { customProperty: [{ field: 'first_name', operator: 'is', value: 'Jane' }] },
		});

		await node.execute.call(mockExecuteFunctions);

		expect(GenericFunctions.erpNextApiRequest).toHaveBeenCalledWith(
			'GET',
			'/api/resource/Customer',
			{},
			expect.objectContaining({
				filters: JSON.stringify([['Customer', 'first_name', '=', 'Jane']]),
			}),
		);
	});
});

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
