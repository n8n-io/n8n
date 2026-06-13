import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { BrandfetchV1 } from '../../v1/BrandfetchV1.node';
import * as GenericFunctions from '../../v1/GenericFunctions';

jest.mock('../../v1/GenericFunctions', () => ({
	brandfetchApiRequest: jest.fn(),
	fetchAndPrepareBinaryData: jest.fn(),
}));

const baseNode: INode = {
	id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
	name: 'Brandfetch',
	type: 'n8n-nodes-base.Brandfetch',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('BrandfetchV1.execute', () => {
	let node: BrandfetchV1;
	let executeFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		node = new BrandfetchV1({
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
		executeFunctions.getNodeParameter.mockImplementation((name) => params[name as string] as never);
	}

	it('should return logos as JSON when operation is logo and download is false', async () => {
		mockParams({ operation: 'logo', domain: 'n8n.io', download: false });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [{ type: 'logo', formats: [] }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith('GET', '/brands/n8n.io');
		expect(GenericFunctions.fetchAndPrepareBinaryData).not.toHaveBeenCalled();
		expect(result[0]).toEqual([{ type: 'logo', formats: [] }]);
	});

	it('should download logos as binary data when download is true', async () => {
		mockParams({
			operation: 'logo',
			domain: 'n8n.io',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['png'],
		});
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/n8n.io/logo.png' }],
				},
				{
					type: 'icon',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/n8n.io/icon.png' }],
				},
			],
		});

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).toHaveBeenCalledTimes(1);
		const [imageType, format, logoFormat, domain] = (
			GenericFunctions.fetchAndPrepareBinaryData as jest.Mock
		).mock.calls[0];
		expect(imageType).toBe('logo');
		expect(format).toBe('png');
		expect(logoFormat).toEqual({
			format: 'png',
			src: 'https://cdn.brandfetch.io/n8n.io/logo.png',
		});
		expect(domain).toBe('n8n.io');
		expect(result[0][0].json).toEqual([
			{
				type: 'logo',
				formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/n8n.io/logo.png' }],
			},
			{
				type: 'icon',
				formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/n8n.io/icon.png' }],
			},
		]);
	});

	it('should skip logo formats with null src', async () => {
		mockParams({
			operation: 'logo',
			domain: 'n8n.io',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['png'],
		});
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

	it('should preserve existing binary data when downloading logos', async () => {
		mockParams({
			operation: 'logo',
			domain: 'n8n.io',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['png'],
		});
		executeFunctions.getInputData.mockReturnValue([
			{ json: {}, binary: { existing: { data: 'keep' } as never } },
		]);
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/logo.png' }],
				},
			],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0][0].binary).toHaveProperty('existing');
	});

	it('should drop empty binary key when no formats match', async () => {
		mockParams({
			operation: 'logo',
			domain: 'n8n.io',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['svg'],
		});
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/logo.png' }],
				},
			],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0][0].binary).toBeUndefined();
	});

	it('should return colors when operation is color', async () => {
		mockParams({ operation: 'color', domain: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			colors: [{ hex: '#ff0000' }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ hex: '#ff0000' }]);
	});

	it('should return fonts when operation is font', async () => {
		mockParams({ operation: 'font', domain: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			fonts: [{ name: 'Inter' }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ name: 'Inter' }]);
	});

	it('should return company data when operation is company', async () => {
		mockParams({ operation: 'company', domain: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			company: { name: 'n8n' },
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ name: 'n8n' }]);
	});

	it('should return industries when operation is industry', async () => {
		mockParams({ operation: 'industry', domain: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			company: { industries: [{ name: 'Software' }] },
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ name: 'Software' }]);
	});

	it('should return an empty industries array when company is missing', async () => {
		mockParams({ operation: 'industry', domain: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([]);
	});

	it('should push an error item when continueOnFail is true', async () => {
		mockParams({ operation: 'color', domain: 'n8n.io' });
		executeFunctions.continueOnFail.mockReturnValue(true);
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockRejectedValue(new Error('boom'));

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ error: 'boom', json: {}, itemIndex: 0 }]);
	});

	it('should rethrow errors when continueOnFail is false', async () => {
		mockParams({ operation: 'color', domain: 'n8n.io' });
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockRejectedValue(new Error('boom'));

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('boom');
	});

	it('should process every input item', async () => {
		mockParams({ operation: 'color', domain: 'n8n.io' });
		executeFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);
		(GenericFunctions.brandfetchApiRequest as jest.Mock).mockResolvedValue({
			colors: [{ hex: '#000' }],
		});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledTimes(3);
	});

	it('exposes a valid node description', () => {
		const description = node.description;
		expect(description.version).toBe(1);
		const operationParam = description.properties.find((p) => p.name === 'operation');
		expect(operationParam?.options?.map((o) => (o as { value: string }).value)).toEqual(
			expect.arrayContaining(['color', 'company', 'font', 'industry', 'logo']),
		);
	});
});
