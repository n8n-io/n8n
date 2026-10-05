import { provider } from '@n8n/node-sdk';
import type {
	IDataObject,
	IDataTableProjectService,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeParameters,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { toolActions, toolTypeOf, toVersionedToolType, versionsOf } from '../index';

const DATE = '2026-09-15T09:30:00.000Z';

const supplyTool = async (
	parameters: INodeParameters,
	{
		action = 'httpRequest.get',
		settings = {},
		helpers = {},
		respond = async () => [{ title: 'Hello' }, { title: 'World' }],
	}: {
		action?: string;
		settings?: Partial<INode>;
		helpers?: Record<string, unknown>;
		respond?: (options: IHttpRequestOptions) => Promise<unknown>;
	} = {},
) => {
	const requests: IHttpRequestOptions[] = [];
	const recorded: Array<[string, unknown]> = [];
	const hints: unknown[] = [];
	const node: INode = {
		id: '1',
		name: 'Fetch page',
		type: `@n8n/nodes-base-next.${action}Tool`,
		typeVersion: 3,
		position: [0, 0],
		parameters,
		...settings,
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
		addExecutionHints: (hint: unknown) => hints.push(hint),
		helpers: {
			httpRequest: async (options: IHttpRequestOptions) => {
				requests.push(options);
				return await respond(options);
			},
			...helpers,
		},
		addInputData: (_type: string, data: Array<Array<{ json: unknown }>>) => {
			recorded.push(['input', data[0]?.[0]?.json]);
			return { index: 0 };
		},
		addOutputData: (
			_type: string,
			_index: number,
			data: Array<Array<{ json: unknown }>> | Error,
		) => {
			recorded.push(['output', data instanceof Error ? data.message : data[0]?.[0]?.json]);
		},
	};
	const NodeType = toVersionedToolType(versionsOf(action), (description) => description);
	const version = new NodeType().getNodeType();
	const supply = await version.supplyData?.call(context as unknown as ISupplyDataFunctions, 0);
	const metadata: unknown[] = [];
	const execute = async (items: Array<{ json: IDataObject }>) =>
		await version.execute?.call({
			...context,
			getInputData: () => items,
			setMetadata: (value: unknown) => metadata.push(value),
		} as unknown as IExecuteFunctions);
	return { tool: supply?.response, requests, recorded, execute, metadata, hints };
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
			{ nodeContract: expect.objectContaining({ action: 'httpRequest.get', version: '3.2.0' }) },
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
		expect(ids).toEqual(
			expect.arrayContaining(['httpRequest.get', 'slack.message.send', 'dataTable.row.get']),
		);
		expect(ids).not.toContain('code.javaScript');
		expect(ids).not.toContain('wait.interval');
		expect(ids).not.toContain('httpRequest.download');
		expect(ids).not.toContain('items.set');
		expect(ids).not.toContain('openAi.chatModel');
		expect(ids).not.toContain('dataTable.row.insert');
		expect(toolTypeOf({ id: 'httpRequest.get' })).toBe('@n8n/nodes-base-next.httpRequestGetTool');
	});

	it('read a data table of the project in a tool call', async () => {
		const opened: string[] = [];
		const queries: unknown[] = [];
		const stored = { id: 1, email: 'ada@acme.dev', createdAt: DATE, updatedAt: DATE };
		const table = {
			getColumns: async () => [{ name: 'email', type: 'string', index: 0 }],
			getManyRowsAndCount: async (query: unknown) => {
				queries.push(query);
				return { count: 1, data: [stored] };
			},
		} as unknown as IDataTableProjectService;
		const { tool, hints } = await supplyTool(
			{
				table: { id: 't1' },
				where: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('where', 'The rows') }}",
			},
			{
				action: 'dataTable.row.get',
				helpers: {
					getDataTableAggregateProxy: async () => ({}),
					getDataTableProxy: async (id: string) => {
						opened.push(id);
						return table;
					},
				},
			},
		);
		if (!provider.is('tool', tool)) throw new Error('no tool');
		expect(Object.keys(tool.input.properties ?? {})).toEqual(['where']);

		const rows = await tool.call({
			table: { id: 'other' },
			where: { match: 'all', conditions: [{ column: 'email', op: 'like', value: '%acme%' }] },
		});

		expect(rows).toEqual([stored]);
		expect(opened).toEqual(['t1']);
		expect(queries).toEqual([
			expect.objectContaining({
				filter: {
					type: 'and',
					filters: [{ columnName: 'email', condition: 'like', value: '%acme%' }],
				},
			}),
		]);
		expect(hints).toEqual([]);
	});

	it('retry a failed tool call as the node settings say, and try once on the engine path that retries itself', async () => {
		const failures = [new Error('boom')];
		const { tool, requests, recorded, execute } = await supplyTool(
			{ url: "={{ $fromAI('url', 'The page URL') }}" },
			{
				settings: { retryOnFail: true, maxTries: 2, waitBetweenTries: 0 },
				respond: async () => {
					const failure = failures.shift();
					if (failure) throw failure;
					return [{ title: 'Hello' }];
				},
			},
		);
		if (!provider.is('tool', tool)) throw new Error('no tool');

		expect(await tool.call({ url: 'https://acme.dev/a' })).toEqual([{ title: 'Hello' }]);
		expect(requests).toHaveLength(2);
		expect(recorded.map(([kind]) => kind)).toEqual(['input', 'output', 'input', 'output']);
		expect(recorded[1]?.[1]).toContain('boom');

		failures.push(new Error('again'));
		await expect(execute([{ json: { url: 'https://acme.dev/b' } }])).rejects.toThrow('again');
		expect(requests).toHaveLength(3);
	});

	it('try a tool call once when the node does not retry', async () => {
		const { tool, requests } = await supplyTool(
			{ url: "={{ $fromAI('url', 'The page URL') }}" },
			{ respond: async () => await Promise.reject(new Error('boom')) },
		);
		if (!provider.is('tool', tool)) throw new Error('no tool');

		await expect(tool.call({ url: 'https://acme.dev/a' })).rejects.toThrow('boom');
		expect(requests).toHaveLength(1);
	});
});
