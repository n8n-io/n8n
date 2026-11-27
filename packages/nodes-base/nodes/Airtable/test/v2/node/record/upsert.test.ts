import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as upsert from '../../../../v2/actions/record/upsert.operation';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: vi.fn(),
		batchUpdate: vi.fn(),
		apiRequestAllItems: vi.fn(),
	};
});

describe('Test AirtableV2, upsert operation', () => {
	const createContext = (options: Record<string, unknown> = {}) => {
		const context = mock<IExecuteFunctions>();
		context.helpers.constructExecutionMetaData = vi.fn(() => []);
		context.getNode.mockReturnValue({ parameters: { columns: { schema: [] } } } as any);
		context.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'columns.mappingMode') return 'autoMapInputData';
			if (key === 'columns.matchingColumns') return ['Name'];
			if (key === 'options') return options;
			return undefined;
		});
		return context;
	};

	const getLookupFormula = () =>
		(vi.mocked(transport.apiRequestAllItems).mock.calls[0][3] as { filterByFormula: string })
			.filterByFormula;

	beforeEach(() => {
		vi.mocked(transport.batchUpdate)
			.mockRejectedValueOnce({ description: 'Cannot update more than one record' })
			.mockResolvedValueOnce({ records: [] });
		vi.mocked(transport.apiRequestAllItems).mockResolvedValue({
			records: [{ id: 'recAAA' }, { id: 'recBBB' }],
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should look up duplicate matches by the matching column value', async () => {
		await upsert.execute.call(createContext(), [{ json: { Name: 'foo' } }], 'base', 'table');

		expect(getLookupFormula()).toBe("AND({Name} = 'foo')");
	});

	it('should escape quotes in the matching column value of the lookup formula', async () => {
		await upsert.execute.call(
			createContext({ updateAllMatches: true }),
			[{ json: { Name: "foo'&'", Notes: 'changed' } }],
			'base',
			'table',
		);

		expect(getLookupFormula()).toBe("AND({Name} = 'foo\\'&\\'')");
	});

	it('should update only the first match unless updateAllMatches is set', async () => {
		await upsert.execute.call(createContext(), [{ json: { Name: 'foo' } }], 'base', 'table');

		expect(vi.mocked(transport.batchUpdate).mock.calls[1][2]).toEqual([
			{ id: 'recAAA', fields: { Name: 'foo' } },
		]);
	});
});
