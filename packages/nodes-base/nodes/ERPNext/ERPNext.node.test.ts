import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { ERPNext } from './ERPNext.node';
import { erpNextApiRequest } from './GenericFunctions';

vi.mock('./GenericFunctions', () => ({
	erpNextApiRequest: vi.fn(),
	erpNextApiRequestAllItems: vi.fn(),
}));

const getDocFields = new ERPNext().methods.loadOptions.getDocFields;

const createContext = (typeVersion: number, docType = 'Sales%20Invoice') =>
	({
		getCurrentNodeParameter: vi.fn().mockReturnValue(docType),
		getNode: vi.fn().mockReturnValue({ typeVersion }),
	}) as unknown as ILoadOptionsFunctions;

describe('ERPNext getDocFields', () => {
	beforeEach(() => vi.clearAllMocks());

	it('preserves the resource endpoint for version 1', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({
			data: {
				fields: [
					{ label: 'Posting Date', fieldname: 'posting_date' },
					{ label: 'Customer', fieldname: 'customer' },
				],
			},
		});

		const result = await getDocFields.call(createContext(1));

		expect(erpNextApiRequest).toHaveBeenCalledWith(
			'GET',
			'/api/resource/DocType/Sales%20Invoice',
			{},
		);
		expect(result).toEqual([
			{ name: 'Customer', value: 'customer' },
			{ name: 'Posting Date', value: 'posting_date' },
		]);
	});

	it('loads parent and child fields from the desk form endpoint for version 1.1', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({
			docs: [
				{ fields: [{ label: 'Customer', fieldname: 'customer' }] },
				{ fields: [{ label: 'Item Code', fieldname: 'item_code' }] },
			],
		});

		const result = await getDocFields.call(createContext(1.1));

		expect(erpNextApiRequest).toHaveBeenCalledWith(
			'GET',
			'/api/method/frappe.desk.form.load.getdoctype',
			{},
			{ doctype: 'Sales Invoice' },
		);
		expect(result).toEqual([
			{ name: 'Customer', value: 'customer' },
			{ name: 'Item Code', value: 'item_code' },
		]);
	});

	it('preserves expression values with malformed percent sequences in version 1.1', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({ docs: [] });

		await expect(getDocFields.call(createContext(1.1, '100%'))).resolves.toEqual([]);

		expect(erpNextApiRequest).toHaveBeenCalledWith(
			'GET',
			'/api/method/frappe.desk.form.load.getdoctype',
			{},
			{ doctype: '100%' },
		);
	});

	it('ignores malformed documents and fields in version 1.1 responses', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({
			docs: [
				{},
				{ fields: null },
				{
					fields: [null, { label: 'Missing field name' }, { label: 'Valid', fieldname: 'valid' }],
				},
			],
		});

		await expect(getDocFields.call(createContext(1.1))).resolves.toEqual([
			{ name: 'Valid', value: 'valid' },
		]);
	});

	it('returns no options when version 1.1 receives no documents', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({});

		await expect(getDocFields.call(createContext(1.1))).resolves.toEqual([]);
	});
});
