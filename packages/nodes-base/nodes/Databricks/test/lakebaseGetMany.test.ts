import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as getAll } from '../actions/lakebase/getAll.operation';
import { fetchLakebaseColumns } from '../actions/lakebase/schema';

const TABLE_URL = 'https://host.example/api/2.0/workspace/7/rest/app/public/orders';

// The URL assembly belongs to the picker PR, so the operation tests pin a fixed table URL
vi.mock('../actions/lakebase/helpers', () => ({
	resolveLakebaseTableUrl: vi.fn(async () => TABLE_URL),
	resolveLakebaseSchemaUrl: vi.fn(async () => TABLE_URL.replace(/\/orders$/, '')),
}));
vi.mock('../actions/lakebase/schema', () => ({ fetchLakebaseColumns: vi.fn(async () => []) }));

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const rows = (from: number, count: number): IDataObject[] =>
	Array.from({ length: count }, (_, offset) => ({ id: from + offset }));

describe('Lakebase -> Get Many', () => {
	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'oAuth2',
			lakebaseTable: 'orders',
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue([]);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.getNodeParameter.mockImplementation((name, index, fallback) =>
			index === itemIndex || name === 'authentication' ? (parameters[name] ?? fallback) : fallback,
		);
		context.getCredentials.mockResolvedValue({ host: 'https://host.example' });
		return context;
	};
	const apiMock = (context: ReturnType<typeof setupContext>) =>
		context.helpers.httpRequestWithAuthentication;
	const feedPages = (
		pages: IDataObject[][],
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const context = setupContext(overrides, itemIndex);
		let call = 0;
		apiMock(context).mockImplementation(async () => pages[Math.min(call++, pages.length - 1)]);
		return { context, result: getAll.call(context, itemIndex) };
	};
	const qsOf = (context: ReturnType<typeof setupContext>, call: number) =>
		(apiMock(context).mock.calls[call][1] as { qs: IDataObject }).qs;

	beforeEach(() => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([]);
	});

	it('returns one item per row, paired to the input item', async () => {
		const { context, result } = feedPages([rows(1, 2)]);

		expect(await result).toEqual([
			{ json: { id: 1 }, pairedItem: { item: 0 } },
			{ json: { id: 2 }, pairedItem: { item: 0 } },
		]);
		expect(apiMock(context)).toHaveBeenCalledTimes(1);
	});

	it('reaches the Data API with the OAuth2 credential', async () => {
		const { context, result } = feedPages([rows(1, 1)]);
		await result;

		expect(apiMock(context).mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({ method: 'GET', url: TABLE_URL }),
		);
	});

	it('asks for the limit the user set', async () => {
		const { context, result } = feedPages([rows(1, 5)], { limit: 5 });
		await result;

		expect(qsOf(context, 0)).toEqual(expect.objectContaining({ limit: 5, offset: 0 }));
	});

	it('sends the filter, sort and selected columns', async () => {
		const { context, result } = feedPages([rows(1, 1)], {
			'where.values': [{ column: 'price', condition: 'lt', value: '50' }],
			'sort.values': [{ column: 'price', direction: 'desc' }],
			'options.outputColumns': ['sku', 'price'],
		});
		await result;

		expect(qsOf(context, 0)).toEqual(
			expect.objectContaining({
				and: '(price.lt.50)',
				order: 'price.desc',
				select: 'sku,price',
			}),
		);
	});

	it('splits a limit larger than one page', async () => {
		const { context, result } = feedPages([rows(1, 1000), rows(1001, 500)], { limit: 1500 });

		expect(await result).toHaveLength(1500);
		expect(qsOf(context, 0)).toEqual(expect.objectContaining({ limit: 1000, offset: 0 }));
		expect(qsOf(context, 1)).toEqual(expect.objectContaining({ limit: 500, offset: 1000 }));
	});

	it('pages until a short page when Return All is on', async () => {
		const { context, result } = feedPages([rows(1, 1000), rows(1001, 1000), rows(2001, 3)], {
			returnAll: true,
		});

		expect(await result).toHaveLength(2003);
		expect(apiMock(context)).toHaveBeenCalledTimes(3);
		expect(qsOf(context, 2)).toEqual(expect.objectContaining({ offset: 2000 }));
	});

	it('stops at the page cap rather than looping forever', async () => {
		const { context, result } = feedPages([rows(1, 1000)], { returnAll: true });

		expect(await result).toHaveLength(100_000);
		expect(apiMock(context)).toHaveBeenCalledTimes(100);
	});

	it('orders by the primary key when it has to page without a sort rule', async () => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([
			{ name: 'id', hasDefault: true, isRequired: true, isReadOnly: false, isPrimaryKey: true },
			{ name: 'sku', hasDefault: false, isRequired: false, isReadOnly: false, isPrimaryKey: false },
		]);
		const { context, result } = feedPages([rows(1, 1000), rows(1001, 1)], { returnAll: true });
		await result;

		// Every page has to share one ordering, or the offsets index different result sets
		expect(qsOf(context, 0).order).toBe('id.asc');
		expect(qsOf(context, 1).order).toBe('id.asc');
	});

	it('does not read the schema for a read that fits in one page', async () => {
		const { result } = feedPages([rows(1, 5)], { limit: 5 });
		await result;

		expect(fetchLakebaseColumns).not.toHaveBeenCalled();
	});

	it('orders by every primary key column', async () => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([
			{ name: 'a', hasDefault: false, isRequired: true, isReadOnly: false, isPrimaryKey: true },
			{ name: 'b', hasDefault: false, isRequired: true, isReadOnly: false, isPrimaryKey: true },
		]);
		const { context, result } = feedPages([rows(1, 1000), rows(1001, 1)], { returnAll: true });
		await result;

		expect(qsOf(context, 0).order).toBe('a.asc,b.asc');
	});

	it('keeps paging when the schema cannot be read', async () => {
		vi.mocked(fetchLakebaseColumns).mockRejectedValue(new Error('PGRST205'));
		const { context, result } = feedPages([rows(1, 1000), rows(1001, 1)], { returnAll: true });

		expect(await result).toHaveLength(1001);
		expect(qsOf(context, 0).order).toBeUndefined();
	});

	it('pages anyway when no primary key is reported', async () => {
		const { context, result } = feedPages([rows(1, 1000), rows(1001, 1)], { returnAll: true });

		expect(await result).toHaveLength(1001);
		expect(qsOf(context, 1).order).toBeUndefined();
	});

	it('keeps the user sort rule instead of the primary key', async () => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([
			{ name: 'id', hasDefault: true, isRequired: true, isReadOnly: false, isPrimaryKey: true },
		]);
		const { context, result } = feedPages([rows(1, 1000), rows(1001, 1)], {
			returnAll: true,
			'sort.values': [{ column: 'sku', direction: 'asc' }],
		});
		await result;

		expect(qsOf(context, 1).order).toBe('sku.asc');
		expect(fetchLakebaseColumns).not.toHaveBeenCalled();
	});

	it('reads the item index it was handed', async () => {
		const { result } = feedPages([rows(1, 1)], {}, 2);

		expect(await result).toEqual([{ json: { id: 1 }, pairedItem: { item: 2 } }]);
	});

	it('returns nothing when the table is empty', async () => {
		const { result } = feedPages([[]]);

		expect(await result).toEqual([]);
	});
});
