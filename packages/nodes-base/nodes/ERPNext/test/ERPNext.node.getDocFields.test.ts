import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { ERPNext } from '../ERPNext.node';
import { erpNextApiRequest } from '../GenericFunctions';

vi.mock('../GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<typeof import('../GenericFunctions')>()),
	erpNextApiRequest: vi.fn(),
	erpNextApiRequestAllItems: vi.fn(),
}));

const getDocFields = new ERPNext().methods.loadOptions.getDocFields;

const createContext = (
	typeVersion: number,
	docType = typeVersion < 1.1 ? 'Sales%20Invoice' : 'Sales Invoice',
) =>
	({
		getCurrentNodeParameter: vi.fn().mockReturnValue(docType),
		getNode: vi.fn().mockReturnValue({ typeVersion }),
	}) as unknown as ILoadOptionsFunctions;

describe('ERPNext getDocFields', () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([1, 1.1])(
		'loads parent and child fields from the desk form endpoint for version %s',
		async (version) => {
			vi.mocked(erpNextApiRequest).mockResolvedValue({
				docs: [
					{ fields: [{ label: 'Customer', fieldname: 'customer' }] },
					{ fields: [{ label: 'Item Code', fieldname: 'item_code' }] },
				],
			});

			const result = await getDocFields.call(createContext(version));

			expect(erpNextApiRequest).toHaveBeenCalledWith(
				'GET',
				requestPath`/api/method/frappe.desk.form.load.getdoctype`,
				{},
				{ doctype: 'Sales Invoice' },
			);
			expect(result).toEqual([
				{ name: 'Customer', value: 'customer' },
				{ name: 'Item Code', value: 'item_code' },
			]);
		},
	);

	it('preserves expression values with malformed percent sequences in version 1.1', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({ docs: [] });

		await expect(getDocFields.call(createContext(1.1, '100%'))).resolves.toEqual([]);

		expect(erpNextApiRequest).toHaveBeenCalledWith(
			'GET',
			requestPath`/api/method/frappe.desk.form.load.getdoctype`,
			{},
			{ doctype: '100%' },
		);
	});

	it('ignores malformed documents and fields in responses', async () => {
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

	it('returns no options when the response has no documents', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({});

		await expect(getDocFields.call(createContext(1.1))).resolves.toEqual([]);
	});

	it('adds the all fields option to the filter loader only', async () => {
		vi.mocked(erpNextApiRequest).mockResolvedValue({
			docs: [{ fields: [{ label: 'Customer', fieldname: 'customer' }] }],
		});
		const getDocFilters = new ERPNext().methods.loadOptions.getDocFilters;

		await expect(getDocFilters.call(createContext(1.1))).resolves.toEqual([
			{ name: '*', value: '*' },
			{ name: 'Customer', value: 'customer' },
		]);
		await expect(getDocFields.call(createContext(1.1))).resolves.toEqual([
			{ name: 'Customer', value: 'customer' },
		]);
	});
});
