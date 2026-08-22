import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { Mock } from 'vitest';
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
