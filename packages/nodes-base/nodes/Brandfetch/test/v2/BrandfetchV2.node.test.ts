import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';

import { BrandfetchV2 } from '../../v2/BrandfetchV2.node';
import * as GenericFunctions from '../../v2/GenericFunctions';

vi.mock('../../v2/GenericFunctions', () => ({
	brandfetchApiRequest: vi.fn(),
	fetchAndPrepareBinaryData: vi.fn(),
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
	let executeFunctions: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new BrandfetchV2({
			displayName: 'Brandfetch',
			name: 'Brandfetch',
			icon: 'file:brandfetch.svg',
			group: ['output'],
			description: 'Consume Brandfetch API',
			defaultVersion: 2,
		});

		executeFunctions = {
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue(baseNode),
			getNodeParameter: vi.fn(),
			continueOnFail: vi.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: vi.fn((data) => data),
			},
		} as unknown as Mocked<IExecuteFunctions>;
	});

	function mockParams(params: Record<string, unknown>) {
		(executeFunctions.getNodeParameter as Mock).mockImplementation((name: string) => params[name]);
	}

	// ---------------------------------------------------------------------------
	// operation: data
	// ---------------------------------------------------------------------------

	it('should return full brand data when operation is data', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: 'n8n.io' });
		const brandData = { name: 'n8n', logos: [], colors: [] };
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue(brandData);

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/brands/domain/n8n.io',
		);
		expect(result[0]).toEqual([brandData]);
	});

	it('should URL-encode type and identifier in the resource path', async () => {
		mockParams({ operation: 'data', type: 'isin', identifier: 'US 0378/331005' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/brands/isin/US%200378%2F331005',
		);
	});

	it('should trim whitespace from identifier before building the path', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: '  n8n.io  ' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({});

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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({});

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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
		const [type0, fmt0, , id0, , suffix0] = (GenericFunctions.fetchAndPrepareBinaryData as Mock)
			.mock.calls[0];
		expect(type0).toBe('logo');
		expect(fmt0).toBe('png');
		expect(id0).toBe('n8n.io');
		expect(suffix0).toBe('');

		// Second call: suffix '_1' (matchCounter === 1)
		const [type1, fmt1, , id1, , suffix1] = (GenericFunctions.fetchAndPrepareBinaryData as Mock)
			.mock.calls[1];
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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			logos: [],
		});

		const result = await node.execute.call(executeFunctions);

		// existing binary should be merged into newItem
		expect(result[0][0].binary).toHaveProperty('existing');
	});

	// ---------------------------------------------------------------------------
	// operation: context
	// ---------------------------------------------------------------------------

	it('should return brand context as JSON when operation is context', async () => {
		mockParams({ operation: 'context', domain: 'n8n.io', outputFormat: 'json', cachedOnly: false });
		const context = {
			meta: { domain: 'n8n.io', canonical_name: 'n8n' },
			identity: { tagline: 'Flexible AI workflow automation' },
		};
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue(context);

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/context/n8n.io',
			{},
			{},
			undefined,
			{ headers: { accept: 'application/json' } },
		);
		expect(result[0]).toEqual([context]);
	});

	it('should return brand context as markdown wrapped in a context key', async () => {
		mockParams({
			operation: 'context',
			domain: 'n8n.io',
			outputFormat: 'markdown',
			cachedOnly: false,
		});
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue('# n8n Brand Context');

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/context/n8n.io',
			{},
			{},
			undefined,
			{ json: false, headers: { accept: 'text/markdown' } },
		);
		expect(result[0]).toEqual([{ context: '# n8n Brand Context' }]);
	});

	it('should pass cachedOnly as a query parameter', async () => {
		mockParams({ operation: 'context', domain: 'n8n.io', outputFormat: 'json', cachedOnly: true });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			'/context/n8n.io',
			{},
			{ cachedOnly: true },
			undefined,
			{ headers: { accept: 'application/json' } },
		);
	});

	it('should return an empty item when cachedOnly finds no cached context', async () => {
		mockParams({ operation: 'context', domain: 'n8n.io', outputFormat: 'json', cachedOnly: true });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue(undefined);

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{}]);
	});

	it('should trim and URL-encode the domain for the context path', async () => {
		mockParams({
			operation: 'context',
			domain: '  bücher.example/path  ',
			outputFormat: 'json',
			cachedOnly: false,
		});
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith(
			'GET',
			`/context/${encodeURIComponent('bücher.example/path')}`,
			{},
			{},
			undefined,
			{ headers: { accept: 'application/json' } },
		);
	});

	// ---------------------------------------------------------------------------
	// Error handling
	// ---------------------------------------------------------------------------

	it('should push an error item when continueOnFail is true', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: 'n8n.io' });
		executeFunctions.continueOnFail.mockReturnValue(true);
		(GenericFunctions.brandfetchApiRequest as Mock).mockRejectedValue(new Error('boom'));

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ error: 'boom', json: {}, itemIndex: 0 }]);
	});

	it('should rethrow errors when continueOnFail is false', async () => {
		mockParams({ operation: 'data', type: 'domain', identifier: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockRejectedValue(new Error('boom'));

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('boom');
	});

	it('should process every input item', async () => {
		mockParams({ operation: 'colors', type: 'domain', identifier: 'n8n.io' });
		executeFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
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
			expect.arrayContaining(['logo', 'colors', 'data', 'context']),
		);
		const typeParam = description.properties.find((p) => p.name === 'type');
		expect(typeParam?.options?.map((o) => (o as { value: string }).value)).toEqual(
			expect.arrayContaining(['domain', 'ticker', 'crypto', 'isin']),
		);
	});

	it('shows context-only fields for the context operation and brand fields otherwise', () => {
		const description = node.description;
		const byName = (name: string) => description.properties.find((p) => p.name === name);

		for (const name of ['domain', 'outputFormat', 'cachedOnly']) {
			expect(byName(name)?.displayOptions?.show?.operation).toEqual(['context']);
		}
		for (const name of ['type', 'identifier']) {
			expect([...(byName(name)?.displayOptions?.show?.operation ?? [])].sort()).toEqual([
				'colors',
				'data',
				'logo',
			]);
		}
	});
});
