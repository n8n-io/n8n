import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as getExecute } from '../../actions/page/get.operation';
import { router } from '../../actions/router';

vi.mock('../../actions/page/get.operation', () => ({
	description: [],
	execute: vi.fn(),
}));

const getExecuteMock = vi.mocked(getExecute);

const mockNode: INode = {
	id: 'test-node',
	name: 'Test Confluence Node',
	type: 'n8n-nodes-base.confluence',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function createContext(itemCount: number, continueOnFail = false) {
	const ctx = mockDeep<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mockNode);
	ctx.getInputData.mockReturnValue(Array.from({ length: itemCount }, () => ({ json: {} })));
	ctx.getNodeParameter.mockImplementation(
		(name: string) => (name === 'resource' ? 'page' : 'get') as never,
	);
	ctx.continueOnFail.mockReturnValue(continueOnFail);
	ctx.helpers.returnJsonArray.mockImplementation((data: IDataObject | IDataObject[]) =>
		(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
	);
	ctx.helpers.constructExecutionMetaData.mockImplementation(
		(data: INodeExecutionData[], { itemData }: { itemData: IPairedItemData | IPairedItemData[] }) =>
			data.map((entry) => ({ ...entry, pairedItem: itemData })) as never,
	);
	return ctx;
}

describe('Confluence router', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('runs the page:get operation once per input item', async () => {
		getExecuteMock.mockResolvedValueOnce({ id: '1' }).mockResolvedValueOnce({ id: '2' });
		const ctx = createContext(2);

		const result = await router.call(ctx);

		expect(getExecuteMock).toHaveBeenCalledTimes(2);
		expect(getExecuteMock).toHaveBeenNthCalledWith(1, 0);
		expect(getExecuteMock).toHaveBeenNthCalledWith(2, 1);
		expect(result).toEqual([
			[
				{ json: { id: '1' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('fans an array response out into one item per page', async () => {
		getExecuteMock.mockResolvedValueOnce([{ id: 'root' }, { id: 'child' }]);
		const ctx = createContext(1);

		const result = await router.call(ctx);

		expect(result).toEqual([
			[
				{ json: { id: 'root' }, pairedItem: { item: 0 } },
				{ json: { id: 'child' }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('emits an error item and keeps going when continue-on-fail is on', async () => {
		getExecuteMock
			.mockRejectedValueOnce(new Error('page not found'))
			.mockResolvedValueOnce({ id: '2' });
		const ctx = createContext(2, true);

		const result = await router.call(ctx);

		expect(getExecuteMock).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			[
				{ json: { error: 'page not found' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('rethrows the first failure when continue-on-fail is off', async () => {
		getExecuteMock.mockRejectedValueOnce(new Error('page not found'));
		const ctx = createContext(2);

		await expect(router.call(ctx)).rejects.toThrow('page not found');
		expect(getExecuteMock).toHaveBeenCalledTimes(1);
	});
});
