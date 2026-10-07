import type { ILoadOptionsFunctions, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { OPENAPI_DISABLED_NOTICE } from '../actions/lakebase/openApiDocument';
import { fetchLakebaseColumns } from '../actions/lakebase/schema';
import type { LakebaseColumn } from '../actions/lakebase/schema';
import { getLakebaseMappingColumns } from '../methods/resourceMapping';

vi.mock('../actions/lakebase/schema', async (importOriginal) => ({
	...(await importOriginal<typeof import('../actions/lakebase/schema')>()),
	fetchLakebaseColumns: vi.fn(async () => []),
}));

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const column = (overrides: Partial<LakebaseColumn> = {}): LakebaseColumn => ({
	name: 'sku',
	type: 'string',
	hasDefault: false,
	isRequired: false,
	isReadOnly: false,
	isPrimaryKey: false,
	...overrides,
});

describe('Lakebase -> column mapping', () => {
	const setup = (locators: Record<string, string> = {}) => {
		const values: Record<string, string> = {
			lakebaseProject: 'proj',
			lakebaseBranch: 'main',
			lakebaseDatabase: 'app',
			lakebaseSchema: 'public',
			lakebaseTable: 'orders',
			authentication: 'oAuth2',
			...locators,
		};
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((name) => values[name]);
		context.getCredentials.mockResolvedValue({ host: 'https://host.example' });
		return context;
	};

	it('lists the table columns as mappable fields', async () => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([column({ name: 'sku' })]);

		const { fields } = await getLakebaseMappingColumns.call(setup());

		expect(fields).toEqual([
			expect.objectContaining({ id: 'sku', displayName: 'sku', display: true, type: 'string' }),
		]);
	});

	it.each([
		['a NOT NULL column with no default', { isRequired: true }, true],
		['a NOT NULL column the database defaults', { isRequired: true, hasDefault: true }, false],
		['a read-only NOT NULL column', { isRequired: true, isReadOnly: true }, false],
		['a nullable column', {}, false],
	])('marks %s required=%s', async (_name, overrides, expected) => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([column(overrides)]);

		const { fields } = await getLakebaseMappingColumns.call(setup());

		expect(fields[0].required).toBe(expected);
	});

	it.each([
		['integer', { type: 'integer' }, 'number'],
		['number', { type: 'number' }, 'number'],
		['boolean', { type: 'boolean' }, 'boolean'],
		['array', { type: 'array' }, 'array'],
		['object', { type: 'object' }, 'object'],
		['text', { type: 'string' }, 'string'],
		['a timestamp', { type: 'string', format: 'timestamp with time zone' }, 'dateTime'],
		['a date', { type: 'string', format: 'date' }, 'dateTime'],
		['an enum', { type: 'string', enum: ['a', 'b'] }, 'options'],
		['an unknown type', { type: 'inet' }, 'string'],
	])('maps %s to %s', async (_name, overrides, expected) => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([column(overrides)]);

		const { fields } = await getLakebaseMappingColumns.call(setup());

		expect(fields[0].type).toBe(expected);
	});

	it('offers the enum values as options', async () => {
		vi.mocked(fetchLakebaseColumns).mockResolvedValue([column({ enum: ['new', 'paid'] })]);

		const { fields } = await getLakebaseMappingColumns.call(setup());

		expect(fields[0].options).toEqual(['new', 'paid'].map((value) => ({ name: value, value })));
	});

	it('explains how to switch the schema document on instead of failing', async () => {
		const unavailable = new NodeApiError(node, {
			message: 'Could not find the table',
		} as JsonObject);
		unavailable.context.data = { code: 'PGRST205' };
		vi.mocked(fetchLakebaseColumns).mockRejectedValue(unavailable);

		const result = await getLakebaseMappingColumns.call(setup());

		expect(result).toEqual({ fields: [], emptyFieldsNotice: OPENAPI_DISABLED_NOTICE });
	});

	it('still fails on an error that is not a missing schema document', async () => {
		const denied = new NodeApiError(node, { message: 'Forbidden' } as JsonObject);
		denied.context.data = { code: '42501' };
		vi.mocked(fetchLakebaseColumns).mockRejectedValue(denied);

		await expect(getLakebaseMappingColumns.call(setup())).rejects.toThrow();
	});

	it.each([
		'lakebaseProject',
		'lakebaseBranch',
		'lakebaseDatabase',
		'lakebaseSchema',
		'lakebaseTable',
	])('returns no fields while %s is unset', async (missing) => {
		const { fields } = await getLakebaseMappingColumns.call(setup({ [missing]: '' }));

		expect(fields).toEqual([]);
		expect(fetchLakebaseColumns).not.toHaveBeenCalled();
	});
});
