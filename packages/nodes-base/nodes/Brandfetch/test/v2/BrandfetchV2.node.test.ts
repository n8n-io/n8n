import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { BrandfetchV2 } from '../../v2/BrandfetchV2.node';
import * as GenericFunctions from '../../v2/GenericFunctions';

jest.mock('../../v2/GenericFunctions', () => ({
	brandfetchApiRequest: jest.fn(),
	fetchAndPrepareBinaryData: jest.fn(),
}));

const baseNode: INode = {
	id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
	name: 'Brandfetch',
	type: 'n8n-nodes-base.Brandfetch',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

describe('BrandfetchV2.execute', () => {
	let node: BrandfetchV2;
	let executeFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		node = new BrandfetchV2({
			displayName: 'Brandfetch',
			name: 'Brandfetch',
			icon: 'file:brandfetch.svg',
			group: ['output'],
			description: 'Consume Brandfetch API',
			defaultVersion: 2,
		});

		executeFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue(baseNode),
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: jest.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: jest.fn((data) => data),
			},
		} as unknown as jest.Mocked<IExecuteFunctions>;
	});

	function mockParams(params: Record<string, unknown>) {
		(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
			(name: string) => params[name],
		);
	}

	// ---------------------------------------------------------------------------
	// operation: data
	// ---------------------------------------------------------------------------

	it('should return full brand data when operation is data', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: 'n8n.io' });
		const brandData = { name: 'n8n', logos: [], colors: [] };
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue(brandData);

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/brands/domain/n8n.io',
		);
		expect(result[0]).toEqual([brandData]);
	});

	it('should URL-encode type and identifier in the resource path', async () => {
		mockParams({ operation: 'data', type: 'isin', identifier: 'US 0378/331005' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/brands/isin/US%200378%2F331005',
		);
	});

	it('should trim whitespace from identifier before building the path', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: '  n8n.io  ' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/brands/domain/n8n.io',
		);
	});

	it.each([
		['ticker', 'AAPL'],
		['crypto', 'BTC'],
		['isin', 'US0378331005'],
	] as const)('should build the correct resource path for type %s', async (type, identifier) => {
		mockParams({ operation: 'data', type, identifier });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			`/brands/${type}/${identifier}`,
		);
	});

	// ---------------------------------------------------------------------------
	// operation: colors
	// ---------------------------------------------------------------------------

	it('should return brand colors when operation is colors', async () => {
		mockParams({ operation: 'colors', type: 'domain', identifier: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			colors: [{ hex: '#ff6d5a' }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ hex: '#ff6d5a' }]);
	});

	// ---------------------------------------------------------------------------
	// operation: logo – no download
	// ---------------------------------------------------------------------------

	it('should return logos as JSON when operation is logo and download is false', async () => {
		mockParams({ operation: 'logo', type: 'domain', identifier: 'n8n.io', download: false });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [{ type: 'logo', formats: [] }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).not.toHaveBeenCalled();
		expect(result[0]).toEqual([{ type: 'logo', formats: [] }]);
	});

	// ---------------------------------------------------------------------------
	// operation: logo – download
	// ---------------------------------------------------------------------------

	it('should download all logo formats as binary data when download is true', async () => {
		mockParams({ operation: 'logo', type: 'domain', identifier: 'n8n.io', download: true });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/n8n.io/logo.png' }],
				},
				{
					type: 'icon',
					formats: [{ format: 'svg', src: 'https://cdn.brandfetch.io/n8n.io/icon.svg' }],
				},
			],
		});

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).toHaveBeenCalledTimes(2);

		// First call: no suffix (matchCounter === 0)
		const [type0, fmt0, , id0, , suffix0] = (
			GenericFunctions.fetchAndPrepareBinaryData as jest.Mock
		).mock.calls[0];
		expect(type0).toBe('logo');
		expect(fmt0).toBe('png');
		expect(id0).toBe('n8n.io');
		expect(suffix0).toBe('');

		// Second call: suffix '_1' (matchCounter === 1)
		const [type1, fmt1, , id1, , suffix1] = (
			GenericFunctions.fetchAndPrepareBinaryData as jest.Mock
		).mock.calls[1];
		expect(type1).toBe('icon');
		expect(fmt1).toBe('svg');
		expect(id1).toBe('n8n.io');
		expect(suffix1).toBe('_1');

		// Result json is the logos array
		expect(result[0][0].json).toEqual([
			{
				type: 'logo',
				formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/n8n.io/logo.png' }],
			},
			{
				type: 'icon',
				formats: [{ format: 'svg', src: 'https://cdn.brandfetch.io/n8n.io/icon.svg' }],
			},
		]);
	});

	it('should skip logo formats with null src when downloading', async () => {
		mockParams({ operation: 'logo', type: 'domain', identifier: 'n8n.io', download: true });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: null }],
				},
			],
		});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).not.toHaveBeenCalled();
	});

	it('should skip logo entries with no imageType when downloading', async () => {
		mockParams({ operation: 'logo', type: 'domain', identifier: 'n8n.io', download: true });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [
				{
					// type is missing
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/logo.png' }],
				},
			],
		});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).not.toHaveBeenCalled();
	});

	it('should skip format entries with no format string when downloading', async () => {
		mockParams({ operation: 'logo', type: 'domain', identifier: 'n8n.io', download: true });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ src: 'https://cdn.brandfetch.io/logo.png' /* no format key */ }],
				},
			],
		});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).not.toHaveBeenCalled();
	});

	it('should delete binary key when no formats are downloaded', async () => {
		mockParams({ operation: 'logo', type: 'domain', identifier: 'n8n.io', download: true });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0][0].binary).toBeUndefined();
	});

	it('should preserve existing binary data from the input item when downloading', async () => {
		mockParams({ operation: 'logo', type: 'domain', identifier: 'n8n.io', download: true });
		executeFunctions.getInputData.mockReturnValue([
			{ json: {}, binary: { existing: { data: 'keep' } as never } },
		]);
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [],
		});

		const result = await node.execute.call(executeFunctions);

		// existing binary should be merged into newItem
		expect(result[0][0].binary).toHaveProperty('existing');
	});

	// ---------------------------------------------------------------------------
	// Error handling
	// ---------------------------------------------------------------------------

	it('should push an error item when continueOnFail is true', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: 'n8n.io' });
		executeFunctions.continueOnFail.mockReturnValue(true);
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockRejectedValue(new Error('boom'));

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ error: 'boom', json: {}, itemIndex: 0 }]);
	});

	it('should rethrow errors when continueOnFail is false', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockRejectedValue(new Error('boom'));

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('boom');
	});

	it('should process every input item', async () => {
		mockParams({ operation: 'colors', type: 'domain', identifier: 'n8n.io' });
		executeFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			colors: [{ hex: '#000' }],
		});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledTimes(3);
	});

	// ---------------------------------------------------------------------------
	// Node description
	// ---------------------------------------------------------------------------

	it('exposes a valid node description', () => {
		const description = node.description;
		expect(description.version).toEqual([2]);
		const operationParam = description.properties.find((p) => p.name === 'operation');
		expect(operationParam?.options?.map((o) => (o as { value: string }).value)).toEqual(
			expect.arrayContaining(['logo', 'colors', 'data']),
		);
		const typeParam = description.properties.find((p) => p.name === 'type');
		expect(typeParam?.options?.map((o) => (o as { value: string }).value)).toEqual(
			expect.arrayContaining(['domain', 'ticker', 'crypto', 'isin']),
		);
	});
});
