import { provider } from '@n8n/node-sdk';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeParameters,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { toolActions, toolTypeOf, toVersionedToolType, versionsOf } from '../index';

const supplyTool = async (parameters: INodeParameters) => {
	const requests: IHttpRequestOptions[] = [];
	const recorded: Array<[string, unknown]> = [];
	const node: INode = {
		id: '1',
		name: 'Fetch page',
		type: '@n8n/nodes-base-next.httpRequestGetTool',
		typeVersion: 3,
		position: [0, 0],
		parameters,
	};
	const context = {
		getNode: () => node,
		getNodeParameter: (
			name: string,
			_itemIndex: number,
			fallback: unknown,
			options?: { rawExpressions?: boolean },
		) => {
			const value = parameters[name];
			if (typeof value === 'string' && value.startsWith('=') && !options?.rawExpressions) {
				throw new Error(`${name} was evaluated`);
			}
			return value ?? fallback;
		},
		getCredentials: async () => ({}),
		getExecutionCancelSignal: () => undefined,
		logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
		helpers: {
			httpRequest: async (options: IHttpRequestOptions) => {
				requests.push(options);
				return [{ title: 'Hello' }, { title: 'World' }];
			},
		},
		addInputData: (_type: string, data: Array<Array<{ json: unknown }>>) => {
			recorded.push(['input', data[0]?.[0]?.json]);
			return { index: 0 };
		},
		addOutputData: (_type: string, _index: number, data: Array<Array<{ json: unknown }>>) => {
			recorded.push(['output', data[0]?.[0]?.json]);
		},
	};
	const NodeType = toVersionedToolType(versionsOf('httpRequest.get'), (description) => ({
		...description,
		name: 'httpRequestGetTool',
	}));
	const version = new NodeType().getNodeType(3);
	const supply = await version.supplyData?.call(context as unknown as ISupplyDataFunctions, 0);
	const metadata: unknown[] = [];
	const execute = async (items: Array<{ json: IDataObject }>) =>
		await version.execute?.call({
			...context,
			getInputData: () => items,
			setMetadata: (value: unknown) => metadata.push(value),
		} as unknown as IExecuteFunctions);
	return { tool: supply?.response, requests, recorded, execute, metadata };
};

describe('contract actions as agent tools', () => {
	it('take the $fromAI() fields from the model with their contract schema', async () => {
		const { tool, requests, recorded } = await supplyTool({
			url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', `The page URL`, 'string') }}",
			query: { lang: 'en' },
		});
		if (!provider.is('tool', tool)) throw new Error('no tool');
		expect(tool.name).toBe('Fetch_page');
		expect(tool.description).toBe(
			'Read from any HTTP API. Use a dedicated action when one exists for the service.',
		);
		expect(tool.input).toEqual({
			type: 'object',
			properties: { url: { type: 'string', description: 'The page URL' } },
			required: ['url'],
			additionalProperties: false,
		});

		const result = await tool.call({ url: 'https://acme.dev/pages', query: { lang: 'de' } });

		expect(result).toEqual([{ title: 'Hello' }, { title: 'World' }]);
		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({ url: 'https://acme.dev/pages', qs: { lang: 'en' } });
		expect(recorded).toEqual([
			['input', { call: { url: 'https://acme.dev/pages', query: { lang: 'de' } } }],
			['output', { response: { value: '[{"title":"Hello"},{"title":"World"}]' } }],
		]);
	});

	it('run each input item as one tool call when the engine runs the tool node', async () => {
		const { execute, requests, metadata } = await supplyTool({
			url: "={{ $fromAi('url', 'The page URL', 'string', 'https://acme.dev') }}",
		});
		const output = await execute([{ json: { url: 'https://acme.dev/a' } }]);

		expect(output).toEqual([
			[
				{ json: { title: 'Hello' }, pairedItem: { item: 0 } },
				{ json: { title: 'World' }, pairedItem: { item: 0 } },
			],
		]);
		expect(requests.map(({ url }) => url)).toEqual(['https://acme.dev/a']);
		expect(metadata).toEqual([
			{ nodeContract: expect.objectContaining({ action: 'httpRequest.get', version: '3.1.0' }) },
		]);
	});

	it('use the tool description of the node, and refuse $fromAI() inside a value', async () => {
		const { tool } = await supplyTool({
			url: 'https://acme.dev',
			toolDescription: 'Read the Acme home page.',
		});
		if (!provider.is('tool', tool)) throw new Error('no tool');
		expect(tool.description).toBe('Read the Acme home page.');
		expect(tool.input.properties).toEqual({});

		await expect(supplyTool({ url: "=https://acme.dev/{{ $fromAI('path') }}" })).rejects.toThrow(
			'The url field uses $fromAI() inside a value',
		);
	});

	it('give a tool node type for each action that reads or writes one call at a time', () => {
		const ids = toolActions.map(({ id }) => id);
		expect(ids).toEqual(expect.arrayContaining(['httpRequest.get', 'slack.message.send']));
		expect(ids).not.toContain('dataTable.row.get');
		expect(ids).not.toContain('httpRequest.download');
		expect(ids).not.toContain('items.set');
		expect(ids).not.toContain('openAi.chatModel');
		expect(ids).not.toContain('dataTable.row.insert');
		expect(toolTypeOf({ id: 'httpRequest.get' })).toBe('@n8n/nodes-base-next.httpRequestGetTool');
	});
});
