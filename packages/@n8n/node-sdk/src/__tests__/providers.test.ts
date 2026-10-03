import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { generateNodeModule, modelCatalogDeclaration, toTs } from '../entry/codegen';
import { compat, credential } from '../entry/credentials';
import { isToolContract, toNodeType } from '../entry/host';
import { lintContract, toContract } from '../entry/registry';
import {
	defineNode,
	path,
	provider,
	t,
	type ActionFlow,
	type AnySchema,
	type ChatModel,
	type ChatRequest,
	type Shape,
	type Tool,
} from '../index';
import { replayCapability } from '../providers';
import { executorOf, type ExecutorHost } from '../runtime';
import { runAction } from '../testing';

const llm = defineNode({
	id: 'llm',
	displayName: 'LLM',
	credential: credential({ types: [compat('llmApi', { hosts: ['llm.test'] })] }),
	baseUrl: 'https://llm.test/v1',
});

const chatModel = llm.provider('chatModel', {
	action: 'LLM Chat Model',
	summary: 'A chat model.',
	provides: 'chatModel',
	input: { model: t.modelId('llm'), temperature: t.num().optional() },
	async provide({ input, http }) {
		return {
			model: input.model,
			async chat(request: ChatRequest) {
				const body = await http.request({ method: 'POST', path: path`/chat`, body: request });
				const text = typeof body === 'object' && body !== null && 'text' in body ? body.text : '';
				return { text: String(text), toolCalls: [], finishReason: 'stop' };
			},
		};
	},
});

const ai = defineNode({ id: 'ai', displayName: 'AI' });

const ask = ai.action('ask', {
	action: 'Ask',
	summary: 'Ask a model.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		model: provider.input('chatModel'),
		tools: t.arr(provider.input('tool')).optional(),
		prompt: t.str(),
	},
	output: t.obj({ text: t.str(), tools: t.arr(t.str()) }),
	async run({ input }) {
		const reply = await input.model.chat({ messages: [{ role: 'user', content: input.prompt }] });
		return { text: reply.text, tools: (input.tools ?? []).map(({ name }) => name) };
	},
});

const node: INode = {
	id: '1',
	name: 'Ask',
	type: 'ask',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const fakeModel = (text: string): ChatModel => ({
	model: 'fake',
	chat: async () => ({ text, toolCalls: [], finishReason: 'stop' }),
});

const fakeTool: Tool = {
	name: 'lookup',
	description: 'Look up a record.',
	input: { type: 'object', properties: {} },
	call: async () => ({ ok: true }),
};

describe('provider contracts', () => {
	it('map provider.input() fields to ai inputs and a provider to an ai output', () => {
		const root = new (toNodeType(ask))().description;
		expect(root.inputs).toEqual([
			'main',
			{ type: 'ai_languageModel', displayName: 'Chat Model', required: true, maxConnections: 1 },
			{ type: 'ai_tool', displayName: 'Tool', required: false },
		]);
		expect(root.outputs).toEqual(['main']);
		expect(root.properties.map(({ name }) => name)).toEqual(['prompt']);

		const sub = new (toNodeType(chatModel))().description;
		expect(sub.inputs).toEqual([]);
		expect(sub.outputs).toEqual(['ai_languageModel']);
		expect(sub.outputNames).toEqual(['Chat Model']);
		expect(sub.properties.map(({ name }) => name)).toEqual(['model', 'temperature']);
	});

	it('give run() the capabilities, read once per run', async () => {
		const reads: string[] = [];
		const host: ExecutorHost = {
			items: [{ json: { q: 'a' } }, { json: { q: 'b' } }],
			node,
			parameter: (name, itemIndex) => (name === 'prompt' ? `prompt ${itemIndex}` : undefined),
			request: async () => await Promise.reject(new Error('no requests')),
			continueOnFail: () => false,
			supplied: async (kind) => {
				reads.push(kind);
				return kind === 'chatModel' ? fakeModel('hi') : [fakeTool];
			},
		};
		const [items] = await executorOf(ask)(host);
		expect(items?.map(({ json }) => json)).toEqual([
			{ text: 'hi', tools: ['lookup'] },
			{ text: 'hi', tools: ['lookup'] },
		]);
		expect(reads.sort()).toEqual(['chatModel', 'tool']);
	});

	it('refuse a provider that gives something else, e.g. a legacy LangChain model', async () => {
		const legacy = { invoke: async () => ({ content: 'hi' }), lc_namespace: ['langchain'] };
		const result = await runAction(ask, {
			input: { prompt: 'Hello' },
			providers: { chatModel: legacy as unknown as ChatModel },
		});
		expect(result).toMatchObject({
			ok: false,
			error: { message: 'The model input needs a chatModel from a node contract sub-node' },
		});
		expect(provider.is('chatModel', fakeModel('x'))).toBe(true);
		expect(provider.is('tool', { ...fakeTool, name: 'has space' })).toBe(false);
	});

	it('supply a capability that sends requests with the provider credential and records each call', async () => {
		const requests: Array<{ type: string; url: string; body: unknown }> = [];
		const recorded: Array<[string, string, unknown]> = [];
		const context = {
			getNode: () => ({ ...node, name: 'Model', credentials: { llmApi: { id: '1', name: 'L' } } }),
			getNodeParameter: (name: string) => ({ model: 'llm-1', temperature: 0.2 })[name],
			getCredentials: async () => ({}),
			getExecutionCancelSignal: () => undefined,
			logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
			helpers: {
				httpRequestWithAuthentication: async (
					type: string,
					options: { url: string; body: unknown },
				) => {
					requests.push({ type, url: options.url, body: options.body });
					return { text: 'Hello back' };
				},
			},
			addInputData: (type: string, data: Array<Array<{ json: unknown }>>) => {
				recorded.push(['input', type, data[0]?.[0]?.json]);
				return { index: 0 };
			},
			addOutputData: (type: string, _index: number, data: Array<Array<{ json: unknown }>>) => {
				recorded.push(['output', type, data[0]?.[0]?.json]);
			},
		};
		const NodeType = toNodeType(chatModel);
		// The runtime reads only these members.
		const supply = await new NodeType().supplyData?.call(
			context as unknown as ISupplyDataFunctions,
			0,
		);
		const model = supply?.response;
		if (!provider.is('chatModel', model)) throw new Error('no chat model');
		expect(model.model).toBe('llm-1');
		const reply = await model.chat({ messages: [{ role: 'user', content: 'Hello' }] });
		expect(reply.text).toBe('Hello back');
		expect(requests).toEqual([
			{
				type: 'llmApi',
				url: 'https://llm.test/v1/chat',
				body: { messages: [{ role: 'user', content: 'Hello' }] },
			},
		]);
		expect(recorded).toEqual([
			['input', 'ai_languageModel', { chat: { messages: [{ role: 'user', content: 'Hello' }] } }],
			[
				'output',
				'ai_languageModel',
				{ response: { text: 'Hello back', toolCalls: [], finishReason: 'stop' } },
			],
		]);
	});

	it('read a LangChain tool with a JSON Schema back as a tool, and keep a zod one out', async () => {
		const calls: unknown[] = [];
		const langChainTool = {
			name: 'lookup',
			description: 'Look up a record.',
			schema: { type: 'object', properties: { id: { type: 'string' } } },
			invoke: async (args: unknown) => {
				calls.push(args);
				return '{"ok":true}';
			},
		};
		const host = (tool: unknown): ExecutorHost => ({
			items: [{ json: {} }],
			node,
			parameter: (name) => (name === 'prompt' ? 'hi' : undefined),
			request: async () => await Promise.reject(new Error('no requests')),
			continueOnFail: () => false,
			supplied: async (kind) => (kind === 'chatModel' ? fakeModel('hi') : [tool]),
		});
		const [items] = await executorOf(ask)(host(langChainTool));
		expect(items?.[0]?.json).toEqual({ text: 'hi', tools: ['lookup'] });

		const zodLike = { ...langChainTool, schema: { type: 'object', safeParse: () => ({}) } };
		await expect(executorOf(ask)(host(zodLike))).rejects.toThrow(
			'The tools input needs a tool from a node contract sub-node',
		);
	});

	it('make agent tools of the actions that read or write one call at a time', () => {
		const tool = (
			flow: ActionFlow,
			input: Shape = { id: t.str() },
			output: AnySchema = t.obj({ ok: t.str() }),
		) =>
			isToolContract(
				toContract(
					ai.action('probe', {
						action: 'Probe',
						summary: 'Probe.',
						flow,
						input,
						output,
						async run() {
							return {};
						},
					}),
				),
			);
		const read: ActionFlow = { effect: 'read', cardinality: 'per-item' };
		expect(tool(read)).toBe(true);
		expect(tool({ effect: 'write', cardinality: '1:N' })).toBe(true);
		expect(tool({ effect: 'transform', cardinality: 'per-item' })).toBe(false);
		expect(tool({ effect: 'write', cardinality: 'batch' })).toBe(false);
		expect(tool(read, { file: t.binary() })).toBe(false);
		expect(tool(read, { file: t.binary().optional(), id: t.str() })).toBe(true);
		expect(tool(read, { id: t.str() }, t.obj({ file: t.binary() }))).toBe(false);
		expect(isToolContract(toContract(chatModel))).toBe(false);
		expect(isToolContract(toContract(ask))).toBe(false);
	});

	it('replay recorded results in call order', async () => {
		const model = replayCapability('chatModel', { model: 'fake' }, ['a', 'b']);
		const chat = model.chat;
		if (typeof chat !== 'function') throw new Error('no chat');
		expect([await chat(), await chat()]).toEqual(['a', 'b']);
		await expect(chat()).rejects.toThrow('The recorded chatModel has no result left');
	});

	it('define a provider as a per-item action that outputs its capability', () => {
		const contract = toContract(chatModel);
		expect(contract.flow).toEqual({
			effect: 'read',
			cardinality: 'per-item',
			passthrough: 'replace',
		});
		expect(contract.output).toEqual({ 'x-n8n-supply': 'chatModel' });
		expect(chatModel.id).toBe('llm.chatModel');
		const listed = llm.action('models', {
			action: 'Models',
			summary: 'Many models.',
			flow: { effect: 'read', cardinality: '1:N' },
			input: {},
			output: provider.input('chatModel'),
			async *run() {},
		});
		expect(lintContract(toContract(listed))).toEqual([
			'llm.models: a provider is per-item; define it with provider()',
		]);
	});

	it('lint one field per kind, named by its slot, at the top level', () => {
		const twice = ai.action('twice', {
			action: 'Twice',
			summary: 'Two models.',
			flow: { effect: 'transform', cardinality: 'per-item' },
			input: {
				model: provider.input('chatModel'),
				fallback: provider.input('chatModel'),
				nested: t.obj({ tool: provider.input('tool') }),
			},
			output: t.obj({ ok: t.str() }),
			async run() {
				return { ok: 'yes' };
			},
		});
		expect(lintContract(toContract(twice))).toEqual([
			'ai.twice: input fields model, fallback take the same provider kind chatModel',
			'ai.twice: input field fallback takes chatModel, so its name is model',
			'ai.twice: a provider.input() field must be a top-level field',
		]);
		expect(lintContract(toContract(ask))).toEqual([]);
		expect(lintContract(toContract(chatModel))).toEqual([]);
	});

	it('generate a provider factory, typed provider fields, and catalog model IDs', () => {
		const module = generateNodeModule('llm', [
			{ contract: toContract(chatModel), nodeType: 'pkg.llmChatModel', operation: 'chatModel' },
		]);
		expect(module).toContain(
			"import { contractProvider, type ModelOf, type NodeSettings, type Provider, type Value } from '@n8n/workflow-sdk/next';",
		);
		expect(module).toContain('model: Value<I, C, ModelOf<"llm">>;');
		expect(module).toContain('): Provider<In, Ctx, "chatModel"> =>');
		expect(module).toContain('contractProvider("pkg.llmChatModel", "chatModel", config)');
		expect(module).not.toContain('LlmChatModelOutput');

		const root = generateNodeModule('ai', [
			{ contract: toContract(ask), nodeType: 'pkg.aiAsk', operation: 'ask' },
		]);
		expect(root).toContain('model: Provider<NoInfer<I>, NoInfer<C>, "chatModel">;');
		expect(root).toContain('tools?: Array<Provider<NoInfer<I>, NoInfer<C>, "tool">>;');
	});

	it('generate a tool factory for a tool action, which a derived tools slot also takes', () => {
		const lookup = llm.action('lookup', {
			action: 'Look up',
			summary: 'Look up a record.',
			flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
			input: { id: t.str() },
			output: t.obj({ ok: t.str() }),
			async run() {
				return { ok: 'yes' };
			},
		});
		const module = generateNodeModule('llm', [
			{ contract: toContract(lookup), nodeType: 'pkg.llmLookup', operation: 'lookup' },
			{ contract: toContract(chatModel), nodeType: 'pkg.llmChatModel', operation: 'chatModel' },
		]);
		expect(module).toContain('/** Look up, as an agent tool (read, idempotent) */');
		expect(module).toContain(
			'lookupTool: <In, Ctx>(config: ToolConfig<LlmLookupInput<In, Ctx>>): Provider<In, Ctx, "tool"> =>',
		);
		expect(module).toContain('contractTool("pkg.llmLookupTool", config)');
		expect(module).not.toContain('chatModelTool');
		const slot = { type: 'array', items: { 'x-n8n-supply': 'ai_tool' } } as const;
		expect(toTs(slot, { input: true, indent: '', compact: true })).toBe(
			'Array<Provider<NoInfer<I>, NoInfer<C>, "ai_tool" | "tool">>',
		);
	});

	it('declare a model catalog for ModelOf', () => {
		expect(modelCatalogDeclaration({ openai: ['gpt-5', 'gpt-5-mini', 'gpt-5'], empty: [] })).toBe(
			[
				'export {};',
				"declare module '@n8n/workflow-sdk/next' {",
				'\tinterface ModelCatalog {',
				'\t\topenai: "gpt-5" | "gpt-5-mini";',
				'\t}',
				'}',
				'',
			].join('\n'),
		);
		expect(modelCatalogDeclaration({})).toBe('export {};\n');
	});
});
