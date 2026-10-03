import vm from 'node:vm';

import type { WorkflowJSON } from '../../types/base';
import {
	composedFactoryKey,
	decompileWorkflow,
	locateNextNodes,
	type ContractFactory,
} from '../decompile';
import * as next from '../index';
import {
	contractStep,
	contractProvider,
	contractTrigger,
	expr,
	manual,
	node,
	onError,
	recover,
	route,
	set,
	provider,
	steps,
	when,
	workflow,
	type Dollar,
	type NodeSettings,
	type Step,
	type Provider,
} from '../index';

interface Page {
	id: string;
	name: string;
	url: string;
	property_completed: { start: string; end: string | null } | null;
	property_owners: string[];
}

const NOTION_TYPE = '@n8n/nodes-base-next.notionDatabasePageGetAll';
const SEND_TYPE = '@n8n/nodes-base-next.httpRequestSend';

type Where = {
	match: 'all' | 'any';
	conditions: Array<{
		property: string;
		type: string;
		condition: { op: string; value: string | ((item: unknown, $: Dollar<unknown>) => string) };
	}>;
};

// Stand-ins for the generated modules `@n8n/nodes/notion` and `@n8n/nodes/httpRequest`.
const notion = {
	databasePage: {
		getAll: <In, Ctx, const N extends string>(config: {
			name: N;
			database: string;
			where?: Where;
			settings?: NodeSettings;
		}): Step<In, Ctx, Page, N> => contractStep(NOTION_TYPE, config),
	},
};

const COMPOSED_TYPE = 'n8n-nodes-base.notion';
const OWNED = { resource: 'databasePage', operation: 'getAll' };

// A stand-in for a module whose action runs one slot of the composed Notion v4.
const composedNotion = {
	databasePage: {
		getAll: <In, Ctx, const N extends string>(config: {
			name: N;
			database: string;
			limit?: number;
		}): Step<In, Ctx, Page, N> => contractStep(COMPOSED_TYPE, config, 4, OWNED),
	},
};

const GET_TOOL_TYPE = '@n8n/nodes-base-next.httpRequestGetTool';

const httpRequest = {
	getTool: <In, Ctx>(
		config: next.ToolConfig<{ url: string; query?: Record<string, string> }>,
	): Provider<In, Ctx, 'tool'> => next.contractTool(GET_TOOL_TYPE, config, 3),
	send: <In, Ctx, const N extends string>(config: {
		name: N;
		method: 'POST' | 'PUT';
		url: string;
		body?: { kind: 'json'; json: (item: In, $: Dollar<Ctx>) => object };
	}): Step<In, Ctx, { ok: boolean }, N> => contractStep(SEND_TYPE, config),
};

const AGENT_TYPE = '@n8n/nodes-base-next.aiAgent';
const MODEL_TYPE = '@n8n/nodes-base-next.openAiChatModel';

const ai = {
	agent: <In, Ctx, const N extends string>(config: {
		name: N;
		model: Provider<NoInfer<In>, NoInfer<Ctx>, 'chatModel'>;
		tools?: ReadonlyArray<Provider<NoInfer<In>, NoInfer<Ctx>, 'tool'>>;
		prompt: string | ((item: In) => string);
	}): Step<In, Ctx, { text: string }, N> => contractStep(AGENT_TYPE, config),
};

const openAi = {
	chatModel: <In, Ctx>(config: {
		name: string;
		model: string;
		settings?: NodeSettings;
	}): Provider<In, Ctx, 'chatModel'> => contractProvider(MODEL_TYPE, 'chatModel', config),
};

const WEBHOOK_TYPE = 'n8n-nodes-base.webhook';
const RESPOND_TYPE = 'n8n-nodes-base.respondToWebhook';
const pairing = {
	trigger: WEBHOOK_TYPE,
	reply: RESPOND_TYPE,
	field: 'responseMode',
	value: 'responseNode',
};

// A stand-in for `@n8n/nodes/webhook`: native contracts emit the legacy nodes.
const webhook = {
	trigger: <const N extends string>(config: {
		name: N;
		httpMethod?: 'GET' | 'POST';
		path: string;
		responseMode?: 'onReceived' | 'responseNode';
		settings?: NodeSettings;
	}): next.Trigger<{ body: { id: string } }, N> =>
		next.contractTrigger(WEBHOOK_TYPE, config, 2.2, undefined, { pairing }),
	respond: <In, Ctx, const N extends string>(config: {
		name: N;
		respondWith: 'json' | 'text';
		responseBody?: unknown;
	}): Step<In, Ctx, In, N> =>
		contractStep(RESPOND_TYPE, config, 1.5, undefined, undefined, pairing),
};

const EXISTS_TYPE = '@n8n/nodes-base-next.dataTableRowExists';

const dataTable = {
	row: {
		exists: <In, Ctx, const N extends string>(config: {
			name: N;
			table: string;
		}): next.RoutedStep<In, Ctx, In, N, 'exists' | 'missing'> =>
			next.routedStep(EXISTS_TYPE, config, ['exists', 'missing']),
	},
};

const UPLOAD_TYPE = '@n8n/nodes-base-next.driveFileUpload';

const drive = {
	file: {
		upload: <In, Ctx, const N extends string>(config: {
			name: N;
			file: (item: In, $: Dollar<Ctx>) => next.Binary;
		}): Step<In, Ctx, { id: string }, N> => contractStep(UPLOAD_TYPE, config),
	},
};

const factories = new Map<string, ContractFactory>([
	[
		GET_TOOL_TYPE,
		{
			module: 'httpRequest',
			from: '@n8n/nodes/httpRequest',
			path: 'getTool',
			version: 3,
			inputKeys: ['toolDescription', 'url', 'query'],
			expressionKeys: ['url'],
			tool: true,
		},
	],
	[
		UPLOAD_TYPE,
		{
			module: 'drive',
			from: '@n8n/nodes/drive',
			path: 'file.upload',
			version: 1,
			inputKeys: ['file'],
			expressionKeys: [],
			binaryKeys: ['file'],
		},
	],
	[
		EXISTS_TYPE,
		{
			module: 'dataTable',
			from: '@n8n/nodes/dataTable',
			path: 'row.exists',
			version: 1,
			inputKeys: ['table'],
			expressionKeys: [],
			outputs: ['exists', 'missing'],
		},
	],
	[
		AGENT_TYPE,
		{
			module: 'ai',
			from: '@n8n/nodes/ai',
			path: 'agent',
			version: 1,
			inputKeys: ['model', 'tools', 'memory', 'prompt', 'system'],
			expressionKeys: ['prompt', 'system'],
		},
	],
	[
		MODEL_TYPE,
		{
			module: 'openAi',
			from: '@n8n/nodes/openAi',
			path: 'chatModel',
			version: 1,
			inputKeys: ['model', 'temperature'],
			expressionKeys: ['model', 'temperature'],
		},
	],
	[
		WEBHOOK_TYPE,
		{
			module: 'webhook',
			from: '@n8n/nodes/webhook',
			path: 'trigger',
			version: 2.2,
			inputKeys: ['httpMethod', 'path', 'responseMode'],
			expressionKeys: [],
			closed: true,
		},
	],
	[
		RESPOND_TYPE,
		{
			module: 'webhook',
			from: '@n8n/nodes/webhook',
			path: 'respond',
			version: 1.5,
			inputKeys: ['respondWith', 'responseBody'],
			expressionKeys: [],
			closed: true,
		},
	],
	[
		NOTION_TYPE,
		{
			module: 'notion',
			from: '@n8n/nodes/notion',
			path: 'databasePage.getAll',
			version: 1,
			inputKeys: ['database', 'where', 'limit', 'sort'],
			expressionKeys: ['database', 'limit'],
		},
	],
	[
		composedFactoryKey(COMPOSED_TYPE, 4, OWNED.resource, OWNED.operation),
		{
			module: 'composedNotion',
			from: '@n8n/nodes/composedNotion',
			path: 'databasePage.getAll',
			version: 4,
			inputKeys: ['database', 'where', 'limit', 'sort'],
			expressionKeys: ['database', 'limit'],
		},
	],
	[
		SEND_TYPE,
		{
			module: 'httpRequest',
			from: '@n8n/nodes/httpRequest',
			path: 'send',
			version: 1,
			inputKeys: ['method', 'url', 'query', 'headers', 'body'],
			expressionKeys: ['url'],
		},
	],
]);

const MATTERMOST_TYPE = 'n8n-nodes-base.mattermost';
const POST_SLOT = { resource: 'message', operation: 'post' };

// Stand-in for a derived module, `@n8n/nodes/n8n-nodes-base/mattermost`.
const mattermost = {
	message: {
		post: <In, Ctx, const N extends string>(config: {
			name: N;
			channelId: { mode: 'id'; value: string };
			message: string | ((item: In) => string);
		}): Step<In, Ctx, In, N> => contractStep(MATTERMOST_TYPE, config, 2.3, POST_SLOT),
	},
};

const mattermostPost: ContractFactory = {
	module: 'mattermost',
	from: '@n8n/nodes/n8n-nodes-base/mattermost',
	path: 'message.post',
	version: 2.3,
	inputKeys: ['channelId', 'message'],
	expressionKeys: ['message'],
};

/** Reads a saved Mattermost post node as its derived factory, as the compat layer does. */
const readMattermost: next.LegacyReader = (saved) => {
	if (saved.type !== MATTERMOST_TYPE) return undefined;
	const { resource: _resource, operation: _operation, channelId, ...rest } = saved.parameters ?? {};
	const locator = typeof channelId === 'object' && channelId !== null ? channelId : {};
	const { __rl: _flag, ...value } = locator as Record<string, unknown>;
	return { factory: mattermostPost, parameters: { ...rest, channelId: value } };
};

const LEGACY_AGENT_TYPE = '@n8n/n8n-nodes-langchain.agent';
const CHAT_TYPE = '@n8n/n8n-nodes-langchain.lmChatAcme';
const ACME_TRIGGER_TYPE = 'n8n-nodes-acme.acmeTrigger';

// Stand-ins for derived modules of an AI root node, its provider, and a community trigger.
const agent = {
	execute: <In, Ctx, const N extends string>(config: {
		name: N;
		text: string;
		providers: {
			model: Provider<NoInfer<In>, NoInfer<Ctx>, 'ai_languageModel'>;
			tools?: ReadonlyArray<Provider<NoInfer<In>, NoInfer<Ctx>, 'ai_tool' | 'tool'>>;
		};
	}): Step<In, Ctx, In, N> => contractStep(LEGACY_AGENT_TYPE, config, 3.1),
};
const lmChatAcme = {
	execute: <In, Ctx>(config: {
		name: string;
		model: string;
	}): Provider<In, Ctx, 'ai_languageModel'> =>
		contractProvider(CHAT_TYPE, 'ai_languageModel', config, 1.2),
};
const acmeTrigger = {
	trigger: <const N extends string>(config: { name: N; topic: string }) =>
		contractTrigger<{ q: string }, N>(ACME_TRIGGER_TYPE, config, 2),
};

const derivedFactory = (module: string, path: string, version: number, inputKeys: string[]) => ({
	module,
	from: `@n8n/nodes/${module === 'acmeTrigger' ? 'n8n-nodes-acme' : '@n8n/n8n-nodes-langchain'}/${module}`,
	path,
	version,
	inputKeys,
	expressionKeys: [],
	groupsProviders: true as const,
});

/** Reads saved nodes of the stand-in derived modules, as the compat layer does. */
const readDerived: next.LegacyReader = (saved) => {
	const factory =
		saved.type === LEGACY_AGENT_TYPE
			? derivedFactory('agent', 'execute', 3.1, ['text'])
			: saved.type === CHAT_TYPE
				? derivedFactory('lmChatAcme', 'execute', 1.2, ['model'])
				: saved.type === ACME_TRIGGER_TYPE
					? derivedFactory('acmeTrigger', 'trigger', 2, ['topic'])
					: undefined;
	return factory && { factory, parameters: saved.parameters ?? {} };
};

const modules: Record<string, unknown> = {
	'@n8n/workflow-sdk/next': next,
	'@n8n/nodes/@n8n/n8n-nodes-langchain/agent': { agent },
	'@n8n/nodes/@n8n/n8n-nodes-langchain/lmChatAcme': { lmChatAcme },
	'@n8n/nodes/n8n-nodes-acme/acmeTrigger': { acmeTrigger },
	'@n8n/nodes/n8n-nodes-base/mattermost': { mattermost },
	'@n8n/nodes/notion': { notion },
	'@n8n/nodes/httpRequest': { httpRequest },
	'@n8n/nodes/composedNotion': { composedNotion },
	'@n8n/nodes/ai': { ai },
	'@n8n/nodes/openAi': { openAi },
	'@n8n/nodes/webhook': { webhook },
	'@n8n/nodes/dataTable': { dataTable },
	'@n8n/nodes/drive': { drive },
};

/** Run decompiled source as the sandbox does, with its imports bound to the modules above. */
function build(source: string): WorkflowJSON {
	const code = source
		.replace(/^import \{ ([^}]+) \} from '([^']+)';$/gm, "const { $1 } = require('$2');")
		.replace('export default ', 'module.exports.default = ');
	const module = { exports: { default: undefined as unknown } };
	vm.runInNewContext(code, { require: (id: string) => modules[id], module });
	const built = module.exports.default as next.Workflow;
	return built.toJSON();
}

/** Node ids are random per build; the build keeps saved ids by name. */
const withoutIds = (json: WorkflowJSON) => ({
	...json,
	nodes: json.nodes.map(({ id: _id, ...rest }) => rest),
});

function roundTrip(json: WorkflowJSON, readLegacy?: next.LegacyReader) {
	const source = decompileWorkflow(json, factories, readLegacy);
	if (source === undefined) throw new Error('workflow did not decompile');
	const rebuilt = build(source);
	return { source, rebuilt, again: decompileWorkflow(rebuilt, factories, readLegacy) };
}

const DATABASE = '5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e';

const notionWorkflow = () =>
	workflow(
		'Notion done pages report',
		manual(),
		notion.databasePage.getAll({
			name: 'Get Done Pages',
			database: DATABASE,
			where: {
				match: 'all',
				conditions: [
					{ property: 'Status', type: 'status', condition: { op: 'equals', value: 'Done' } },
					{
						property: 'Completed',
						type: 'date',
						condition: { op: 'on_or_after', value: (_item, $) => $.today.toISODate() },
					},
				],
			},
		}),
		httpRequest.send({
			name: 'Post Done Page',
			method: 'POST',
			url: 'https://reports.example.com/api/done',
			body: {
				kind: 'json',
				json: (page) => ({
					name: page.name,
					owners: page.property_owners.join(', '),
					completed: String(page.property_completed?.start).slice(0, 10),
				}),
			},
		}),
	);

const branchWorkflow = () =>
	workflow(
		'Report owners',
		manual({ name: 'Run' }),
		notion.databasePage.getAll({ name: 'Tasks', database: DATABASE }),
		when(
			{ name: 'Has owner?', if: (page) => page.property_owners.length > 0 },
			{
				then: steps(
					httpRequest.send({
						name: 'Report',
						method: 'POST',
						url: 'https://x.example.com',
						body: { kind: 'json', json: (page, $) => ({ id: page.id, first: $('Tasks').id }) },
					}),
					onError(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
				),
				else: set({
					name: 'Unowned',
					fields: { id: (page) => page.id, source: 'notion' },
					keep: 'all',
				}),
			},
		),
		node({
			name: 'Notify',
			type: 'n8n-nodes-base.slack',
			version: 2.3,
			parameters: {
				text: (_item, $) => `Done: ${$('Tasks').id}`,
				raw: '={{ $input.first().json.id }}',
				object: '={{ { "id": $json.id } }}',
				list: ['a', '={{ $json.id }}'],
			},
		}),
	);

describe('decompileWorkflow', () => {
	it('reads a legacy node back as the factory call of its reader, else keeps node()', () => {
		const posted = (channel: string) =>
			workflow(
				'Post',
				manual(),
				node({
					name: 'Post',
					type: MATTERMOST_TYPE,
					version: 2.3,
					parameters: {
						...POST_SLOT,
						channelId: { __rl: true, mode: 'id', value: channel },
						message: '={{ $json.text }}',
					},
				}),
			).toJSON();
		const json = posted('c1');
		const { source, rebuilt, again } = roundTrip(json, readMattermost);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain("import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';");
		expect(source).toContain('mattermost.message.post({');
		expect(source).not.toContain('__rl');
		expect(roundTrip(json).source).toContain('node({');
		// An expression without a lambda form fails tsc in a nested field: the node keeps node().
		const raw = posted("={{ $('Hook').first().json.channel.toUpperCase() + $now }}");
		const kept = roundTrip(raw, readMattermost);
		expect(kept.source).toContain('node({');
		expect(withoutIds(kept.rebuilt)).toEqual(withoutIds(raw));
	});

	it('reads a derived trigger, root node and provider back as their factories', () => {
		const json = workflow(
			'Ask',
			acmeTrigger.trigger({ name: 'Event', topic: 'questions' }),
			agent.execute({
				name: 'Agent',
				text: '={{ $json.q }}',
				providers: { model: lmChatAcme.execute({ name: 'Model', model: 'acme-1' }) },
			}),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json, readDerived);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain('acmeTrigger.trigger({');
		expect(source).toContain('agent.execute({');
		expect(source).toMatch(/providers: \{\n\s+model: lmChatAcme\.execute\(\{/);
		expect(source).not.toContain('provider(');
		// Without the reader the nodes stay legacy calls.
		expect(roundTrip(json).source).toContain('providers: {\n');
		expect(roundTrip(json).source).toContain('model: provider({');
	});

	it('round-trips the Notion report to the same workflow JSON', () => {
		const json = notionWorkflow().toJSON();
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain("import { workflow, manual } from '@n8n/workflow-sdk/next';");
		expect(source).toContain("import { notion } from '@n8n/nodes/notion';");
		expect(source).toContain('notion.databasePage.getAll({');
		expect(source).toContain('value: (_item, $) => $.today.toISODate(),');
		expect(source).toContain('json: (item) => ({');
	});

	it('round-trips a contract trigger and its reply step', () => {
		const json = workflow(
			'Echo',
			webhook.trigger({
				name: 'Hook',
				httpMethod: 'POST',
				path: 'echo',
				responseMode: 'responseNode',
			}),
			webhook.respond({
				name: 'Reply',
				respondWith: 'json',
				responseBody: (_item: unknown, $: Dollar<{ Hook: { body: { id: string } } }>) => ({
					id: $('Hook').body.id,
				}),
			}),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json);
		const withoutWebhookIds = (saved: WorkflowJSON) =>
			withoutIds({ ...saved, nodes: saved.nodes.map(({ webhookId: _id, ...rest }) => rest) });

		expect(withoutWebhookIds(rebuilt)).toEqual(withoutWebhookIds(json));
		expect(again).toBe(source);
		expect(source).toContain("import { webhook } from '@n8n/nodes/webhook';");
		expect(source).toContain('webhook.trigger({');
		expect(source).toContain('webhook.respond({');

		const extra = {
			...json,
			nodes: json.nodes.map((n) =>
				n.type === RESPOND_TYPE
					? { ...n, parameters: { ...n.parameters, enableResponseOutput: true } }
					: n,
			),
		};
		const kept = roundTrip(extra);
		expect(kept.source).not.toContain('webhook.respond({');
		expect(withoutWebhookIds(kept.rebuilt)).toEqual(withoutWebhookIds(extra));
	});

	it('round-trips a routed step whose later outputs have flows', () => {
		const json = workflow(
			'Known',
			manual(),
			route(dataTable.row.exists({ name: 'Known', table: 'leads' }), {
				exists: set({ name: 'Old', fields: { seen: true } }),
				missing: set({ name: 'New', fields: { seen: false } }),
			}),
			set({ name: 'After', fields: { done: true } }),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain('  route(dataTable.row.exists({');
		expect(source).toContain('missing: set({');

		const onlyMissing = workflow(
			'Missing',
			manual(),
			route(dataTable.row.exists({ name: 'Known', table: 'leads' }), {
				exists: steps(),
				missing: set({ name: 'New', fields: { seen: false } }),
			}),
		).toJSON();
		const missing = roundTrip(onlyMissing);
		expect(withoutIds(missing.rebuilt)).toEqual(withoutIds(onlyMissing));
		expect(missing.source).toContain('exists: steps(),');
	});

	it('round-trips a branch, an error output, a join, and the node() escape hatch', () => {
		const json = branchWorkflow().toJSON();
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain('  when({');
		expect(source).toContain('if: (item) => item.property_owners.length > 0,');
		expect(source).toContain('then: steps(');
		expect(source).toContain('onError(set({');
		expect(source).toContain('keep: "all"');
		expect(source).toContain('source: "notion"');
		expect(source).toContain('first: $("Tasks").id');
		// A node() item is Loose, so its expressions stay expr() calls for the expression check.
		expect(source).toContain('text: expr("Done: {{ $(\\"Tasks\\").item.json.id }}"),');
		expect(source).toContain('raw: expr("{{ $input.first().json.id }}"),');
		expect(source).toContain('object: expr("{{ { \\"id\\": $json.id } }}"),');
		expect(source).toContain('expr("{{ $json.id }}"),');
		expect(source).not.toContain('"={{');
	});

	it('round-trips a binary of the item and of an earlier node', () => {
		const typed = notionWorkflow().toJSON();
		const withQuery = {
			...typed,
			nodes: typed.nodes.map((n) =>
				n.type === SEND_TYPE
					? {
							...n,
							parameters: {
								...n.parameters,
								query: {
									file: '={{ $binary.data }}',
									first: '={{ $("Start").item.binary.data.fileName }}',
								},
							},
						}
					: n,
			),
		};
		const step = roundTrip(withQuery);
		expect(withoutIds(step.rebuilt)).toEqual(withoutIds(withQuery));
		expect(step.source).toContain('file: (item) => item.binary.data,');
		expect(step.source).toContain('first: (_item, $) => $("Start").binary.data.fileName,');

		const json = workflow(
			'Files',
			manual(),
			node({
				name: 'Upload',
				type: 'n8n-nodes-base.noOp',
				version: 1,
				parameters: {
					file: '={{ $binary.data }}',
					first: '={{ $("Start").item.binary.data.fileName }}',
					field: '={{ $json.binary }}',
				},
			}),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain('file: expr("{{ $binary.data }}"),');
		expect(source).toContain('first: expr("{{ $(\\"Start\\").item.binary.data.fileName }}"),');
		expect(source).toContain('field: expr("{{ $json.binary }}"),');
	});

	it('round-trips mixed expression text with characters that a template literal escapes', () => {
		const sent = workflow(
			'Escapes',
			manual(),
			httpRequest.send({ name: 'Send', method: 'POST', url: 'https://x.example.com' }),
		).toJSON();
		const url = '=https://x.example.com/a`b`d\\e\r\n/{{ $json.id }}';
		const json = {
			...sent,
			nodes: sent.nodes.map((n) =>
				n.type === SEND_TYPE ? { ...n, parameters: { ...n.parameters, url } } : n,
			),
		};
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain('url: (item) => `https://x.example.com/');
	});

	it('drops host-set parameters of a contract node', () => {
		const json = notionWorkflow().toJSON();
		const withAuth = {
			...json,
			nodes: json.nodes.map((n) =>
				n.type === NOTION_TYPE
					? {
							...n,
							parameters: { ...n.parameters, authentication: 'notionApi' },
							credentials: { notionApi: { id: 'c1', name: 'Notion account' } },
						}
					: n,
			),
		};
		const source = decompileWorkflow(withAuth, factories);
		expect(source).toContain('notion.databasePage.getAll({');
		expect(source).not.toContain('authentication');
	});

	it('keeps an expression without a lambda form as expr() in the typed contract step', () => {
		const json = notionWorkflow().toJSON();
		const changed = {
			...json,
			nodes: json.nodes.map((n) =>
				n.type === NOTION_TYPE
					? { ...n, parameters: { ...n.parameters, database: '={{ $input.first().json.db }}' } }
					: n,
			),
		};
		const { source, rebuilt } = roundTrip(changed);
		expect(source).toContain('notion.databasePage.getAll({');
		expect(source).toContain('database: expr("{{ $input.first().json.db }}")');
		expect(withoutIds(rebuilt)).toEqual(withoutIds(changed));
	});

	it('keeps a contract node in node() when a field that takes no expression string has one', () => {
		const json = notionWorkflow().toJSON();
		const changed = {
			...json,
			nodes: json.nodes.map((n) =>
				n.type === SEND_TYPE
					? { ...n, parameters: { ...n.parameters, method: '={{ $input.first().json.verb }}' } }
					: n,
			),
		};
		const { source, rebuilt } = roundTrip(changed);
		expect(source).toContain(`type: "${SEND_TYPE}"`);
		expect(withoutIds(rebuilt)).toEqual(withoutIds(changed));
	});

	it('keeps a contract node of another version in node()', () => {
		const json = notionWorkflow().toJSON();
		const changed = {
			...json,
			nodes: json.nodes.map((n) => (n.type === SEND_TYPE ? { ...n, typeVersion: 2 } : n)),
		};
		const { source, rebuilt } = roundTrip(changed);
		expect(source).toContain(`type: "${SEND_TYPE}"`);
		expect(withoutIds(rebuilt)).toEqual(withoutIds(changed));
	});

	describe('a composed node version', () => {
		const composedWorkflow = () =>
			workflow(
				'Composed Notion',
				manual(),
				composedNotion.databasePage.getAll({ name: 'Get Pages', database: DATABASE, limit: 5 }),
			).toJSON();

		it('reads the owned slot back as the typed step', () => {
			const json = composedWorkflow();
			const { source, rebuilt, again } = roundTrip(json);
			expect(source).toContain('composedNotion.databasePage.getAll({');
			expect(source).not.toContain('resource');
			expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
			expect(again).toBe(source);
		});

		it('keeps an unowned slot of the composed version and older versions in node()', () => {
			const json = composedWorkflow();
			const withNode = (change: object) => ({
				...json,
				nodes: json.nodes.map((n) => (n.type === COMPOSED_TYPE ? { ...n, ...change } : n)),
			});
			const unowned = withNode({ parameters: { resource: 'page', operation: 'create', limit: 5 } });
			const legacy = withNode({ typeVersion: 3 });
			for (const changed of [unowned, legacy]) {
				const { source, rebuilt } = roundTrip(changed);
				expect(source).toContain(`type: "${COMPOSED_TYPE}"`);
				expect(source).not.toContain('@n8n/nodes/');
				expect(withoutIds(rebuilt)).toEqual(withoutIds(changed));
			}
		});
	});

	it('round-trips an AI agent with its providers', () => {
		const json = workflow(
			'Answer',
			manual(),
			node({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 2.2,
				parameters: { promptType: 'define', text: (item) => item.question },
				providers: {
					model: provider({
						name: 'Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						parameters: { model: 'gpt-4o-mini' },
					}),
					tools: [
						provider({
							name: 'Calculator',
							type: '@n8n/n8n-nodes-langchain.toolCalculator',
							version: 1,
						}),
						provider({
							name: 'Store',
							type: '@n8n/n8n-nodes-langchain.toolVectorStore',
							version: 1,
							providers: {
								vectorStore: provider({
									name: 'Vectors',
									type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
									version: 1,
								}),
							},
						}),
					],
				},
			}),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain(
			"import { workflow, manual, node, provider, expr } from '@n8n/workflow-sdk/next';",
		);
		expect(source).toContain('model: provider({');
		expect(source).toContain('tools: [');
		expect(source).toContain('vectorStore: provider({');
		expect(source).toContain('text: expr("{{ $json.question }}"),');
	});

	it('round-trips a contract AI node with its contract provider in the slot field', () => {
		const json = workflow(
			'Answer',
			manual(),
			ai.agent({
				name: 'Agent',
				model: openAi.chatModel({ name: 'Model', model: 'gpt-5-mini' }),
				prompt: 'Hi',
			}),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain("import { workflow, manual } from '@n8n/workflow-sdk/next';");
		expect(source).toContain("import { openAi } from '@n8n/nodes/openAi';");
		expect(source).toContain('model: openAi.chatModel({');

		const legacyModel = {
			...json,
			nodes: json.nodes.map((n) =>
				n.name === 'Model' ? { ...n, type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' } : n,
			),
		};
		expect(decompileWorkflow(legacyModel, factories)).toBeUndefined();
	});

	it('round-trips a contract action tool in a contract and a derived AI node', () => {
		const fetchPage = () =>
			httpRequest.getTool({
				name: 'Fetch page',
				url: next.fromModel('The page URL'),
				query: { lang: 'en' },
			});
		const json = workflow(
			'Research',
			manual(),
			ai.agent({
				name: 'Agent',
				model: openAi.chatModel({ name: 'Model', model: 'gpt-5-mini' }),
				tools: [fetchPage()],
				prompt: 'Hi',
			}),
			agent.execute({
				name: 'Legacy Agent',
				text: 'Hi',
				providers: {
					model: lmChatAcme.execute({ name: 'Legacy Model', model: 'acme-1' }),
					tools: [{ ...fetchPage(), spec: { ...fetchPage().spec, name: 'Fetch again' } }],
				},
			}),
		).toJSON();
		const tool = json.nodes.find(({ name }) => name === 'Fetch page');
		expect(tool?.parameters).toEqual({
			url: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI("url", "The page URL") }}',
			query: { lang: 'en' },
		});
		expect(json.connections['Fetch page']).toEqual({
			ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]],
		});
		expect(json.connections['Fetch again']).toEqual({
			ai_tool: [[{ node: 'Legacy Agent', type: 'ai_tool', index: 0 }]],
		});

		const { source, rebuilt, again } = roundTrip(json, readDerived);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain(
			"import { workflow, manual, fromModel } from '@n8n/workflow-sdk/next';",
		);
		expect(source).toContain('url: fromModel("The page URL"),');
		expect(source).toMatch(/tools: \[\n\s+httpRequest\.getTool\(\{\n\s+name: "Fetch page",/);
		expect(source).toMatch(
			/providers: \{[\s\S]+tools: \[\n\s+httpRequest\.getTool\(\{\n\s+name: "Fetch again",/,
		);
	});

	it('round-trips escapes in a fromModel() description', () => {
		const json = workflow(
			'Escapes',
			manual(),
			ai.agent({
				name: 'Agent',
				model: openAi.chatModel({ name: 'Model', model: 'gpt-5-mini' }),
				tools: [
					httpRequest.getTool({
						name: 'Fetch page',
						url: next.fromModel('The "page" URL\nwith \\ and é'),
					}),
				],
				prompt: 'Hi',
			}),
		).toJSON();
		const { source, rebuilt } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(source).toContain('url: fromModel("The \\"page\\" URL\\nwith \\\\ and é"),');
	});

	it('keeps fromModel() out of a step', () => {
		const step = httpRequest.send({
			name: 'Post',
			method: 'POST',
			url: next.fromModel() as unknown as string,
		});
		expect(() => workflow('Wrong', manual(), step).toJSON()).toThrow(
			'url: fromModel() fills a field of a tool only',
		);
	});

	it('reads an error branch that ends as onError, and one that continues as recover', () => {
		const fetch = () => node({ name: 'Fetch', type: 'n8n-nodes-base.httpRequest', version: 4.2 });
		const alert = () => set({ name: 'Slack', fields: { alerted: true } });
		const summarize = () => set({ name: 'Summarize', fields: { done: true } });
		const ended = workflow('Sweep', manual(), fetch(), onError(alert()), summarize()).toJSON();
		const rejoined = workflow('Sweep', manual(), fetch(), recover(alert()), summarize()).toJSON();

		for (const [json, macro] of [
			[ended, '  onError(set({'],
			[rejoined, '  recover(set({'],
		] as const) {
			const { source, rebuilt, again } = roundTrip(json);
			expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
			expect(again).toBe(source);
			expect(source).toContain(macro);
		}
		expect(ended.connections.Slack).toBeUndefined();
	});

	it('keeps an editor-built Loop Over Items as JSON', () => {
		const at = (name: string, output = 0) => ({ [name]: output });
		const nodes: WorkflowJSON['nodes'] = [
			{
				id: '1',
				name: 'Every Morning',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 8 }] } },
			},
			{
				id: '2',
				name: 'Split Out Orders',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [0, 0],
				parameters: { options: {}, fieldToSplitOut: 'orders' },
			},
			{
				id: '3',
				name: 'Loop Over Orders',
				type: 'n8n-nodes-base.splitInBatches',
				typeVersion: 3,
				position: [0, 0],
				parameters: { options: {}, batchSize: 1 },
			},
			{
				id: '4',
				name: 'Look Up Order',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: { resource: 'row', operation: 'get', limit: 1 },
				alwaysOutputData: true,
			},
			{
				id: '5',
				name: 'Order Already Known?',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				position: [0, 0],
				parameters: { conditions: { conditions: [{ leftValue: '={{ $json.order_id }}' }] } },
			},
			{
				id: '6',
				name: 'Refresh Last Seen',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: { resource: 'row', operation: 'update' },
			},
			{
				id: '7',
				name: 'Add New Order',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: {
					resource: 'row',
					operation: 'insert',
					columns: { value: { order_id: "={{ $('Loop Over Orders').item.json.id }}" } },
				},
			},
			{
				id: '8',
				name: 'Email Ops',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.1,
				position: [0, 0],
				parameters: { sendTo: 'ops@acme-demo.test', subject: '=New order {{ $json.id }}' },
			},
		];
		const main = (...targets: Array<Array<Record<string, number>>>) => ({
			main: targets.map((list) =>
				list.flatMap((entry) =>
					Object.entries(entry).map(([node, index]) => ({ node, type: 'main' as const, index })),
				),
			),
		});
		const json: WorkflowJSON = {
			name: 'Order Sync Log Updater',
			nodes,
			connections: {
				'Every Morning': main([at('Split Out Orders')]),
				'Split Out Orders': main([at('Loop Over Orders')]),
				'Loop Over Orders': main([], [at('Look Up Order')]),
				'Look Up Order': main([at('Order Already Known?')]),
				'Order Already Known?': main([at('Refresh Last Seen')], [at('Add New Order')]),
				'Refresh Last Seen': main([at('Loop Over Orders')]),
				'Add New Order': main([at('Email Ops')]),
				'Email Ops': main([at('Loop Over Orders')]),
			},
		};
		expect(decompileWorkflow(json, factories)).toBeUndefined();
	});

	it('reads the binary key of a binary field as the lambda that reads it', () => {
		const saved = (file: string): WorkflowJSON => ({
			name: 'Upload',
			nodes: [
				{
					id: '1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Upload',
					type: UPLOAD_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: { file },
				},
			],
			connections: { Start: { main: [[{ node: 'Upload', type: 'main', index: 0 }]] } },
		});
		const plain = decompileWorkflow(saved('data'), factories);
		expect(plain).toContain('drive.file.upload({');
		expect(plain).toContain('file: (item) => item.binary.data,');
		expect(decompileWorkflow(saved('={{ $binary.data }}'), factories)).toBe(plain);
		expect(decompileWorkflow(saved('my file'), factories)).toContain(
			'file: (item) => item.binary["my file"],',
		);
	});

	it('puts positions past the workflow() limit into steps(), and lists each trigger', () => {
		const names = Array.from({ length: 62 }, (_, index) => `Step ${index}`);
		const setNode = (name: string, index: number) => ({
			id: name,
			name,
			type: '@n8n/nodes-base-next.itemsSet',
			typeVersion: 1,
			position: [index * 100, 0] as [number, number],
			parameters: { fields: { n: index }, include: { mode: 'none' } },
		});
		const trigger = (name: string) => ({
			id: name,
			name,
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		});
		const to = (node: string) => ({ main: [[{ node, type: 'main' as const, index: 0 }]] });
		const chain = ['Start', ...names];
		const saved = workflow(
			'Long',
			manual(),
			set({ name: 'Other', fields: { n: 0 } }),
			manual({ name: 'Again' }),
		).toJSON();
		const json: WorkflowJSON = {
			...saved,
			nodes: [trigger('Start'), ...names.map(setNode), trigger('Again'), setNode('Other', 0)],
			connections: {
				...Object.fromEntries(
					chain.slice(0, -1).map((name, index) => [name, to(chain[index + 1])]),
				),
				Again: to('Other'),
			},
		};
		const { source, rebuilt, again } = roundTrip(json);

		const sorted = (saved: WorkflowJSON) => saved.nodes.map(({ name }) => name).sort();
		expect(sorted(rebuilt)).toEqual(sorted(json));
		expect(rebuilt.connections).toEqual(json.connections);
		expect(again).toBe(source);
		expect(source.match(/steps\(/g)).toHaveLength(2);
		expect(source).toContain('  manual({ name: "Again" }),\n');
	});

	it('reads a set field with an expression that has no lambda form as expr()', () => {
		const json = workflow(
			'Fields',
			manual(),
			set({ name: 'Fields', fields: { first: expr('{{ $input.first().json.id }}'), n: 1 } }),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json);
		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain('set({');
		expect(source).toContain('first: expr("{{ $input.first().json.id }}"),');
	});

	it('reads an Edit Fields node with dotted keys and kept field paths as set', () => {
		const json = workflow(
			'Fields',
			manual(),
			set({ name: 'Picked', fields: { 'user.name': 'Ada' }, keep: { selected: ['id', 'a.b'] } }),
			set({ name: 'Dropped', fields: { n: 1 }, keep: { except: ['user.name'] } }),
		).toJSON();
		const { source, rebuilt, again } = roundTrip(json);
		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).not.toContain('items.set(');
		expect(source).toContain('"user.name": "Ada",');
		expect(source).toMatch(/keep: \{\s*selected: \[\s*"id",\s*"a\.b",\s*\],\s*\}/);
		expect(source).toMatch(/keep: \{\s*except: \[\s*"user\.name",\s*\],\s*\}/);
	});

	it('keeps an Edit Fields node with an index key out of set', () => {
		const json = workflow('Fields', manual(), set({ name: 'Fields', fields: { a: 1 } })).toJSON();
		const indexed = {
			...json,
			nodes: json.nodes.map((n) =>
				n.name === 'Fields' ? { ...n, parameters: { ...n.parameters, fields: { 'a[0]': 1 } } } : n,
			),
		};
		const { source, rebuilt } = roundTrip(indexed);
		expect(source).not.toContain(' set({');
		expect(source).toContain('"a[0]": 1');
		expect(withoutIds(rebuilt)).toEqual(withoutIds(indexed));
	});

	it('round-trips node settings on a trigger, a typed step, node(), and a provider', () => {
		const json = workflow(
			'Settings',
			webhook.trigger({ name: 'Hook', path: 'in', settings: { notes: 'From the CRM' } }),
			notion.databasePage.getAll({
				name: 'Pages',
				database: DATABASE,
				settings: { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000 },
			}),
			node({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 2.2,
				settings: {
					alwaysOutputData: true,
					executeOnce: true,
					onError: 'continueRegularOutput',
					notes: 'Answers once',
					notesInFlow: true,
				},
				providers: {
					model: provider({
						name: 'Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						settings: { notes: 'Cheap model' },
					}),
				},
			}),
			node({
				name: 'Send',
				type: 'n8n-nodes-base.noOp',
				version: 1,
				settings: { onError: 'stopWorkflow', retryOnFail: true },
			}),
			onError(set({ name: 'Log', fields: { failed: true } })),
		).toJSON();
		const byName = new Map(json.nodes.map((n) => [n.name, n]));
		expect(byName.get('Hook')).toMatchObject({ notes: 'From the CRM' });
		expect(byName.get('Pages')).toMatchObject({ retryOnFail: true, maxTries: 3 });
		expect(byName.get('Agent')).toMatchObject({
			onError: 'continueRegularOutput',
			notesInFlow: true,
		});
		expect(byName.get('Model')).toMatchObject({ notes: 'Cheap model' });
		// The error output of onError wins over the setting.
		expect(byName.get('Send')).toMatchObject({ onError: 'continueErrorOutput', retryOnFail: true });

		const { source, rebuilt, again } = roundTrip(json);
		const withoutWebhookIds = (saved: WorkflowJSON) =>
			withoutIds({ ...saved, nodes: saved.nodes.map(({ webhookId: _id, ...rest }) => rest) });
		expect(withoutWebhookIds(rebuilt)).toEqual(withoutWebhookIds(json));
		expect(again).toBe(source);
		expect(source).toContain('webhook.trigger({');
		expect(source).toContain('notion.databasePage.getAll({');
		expect(source).toContain('retryOnFail: true,');
		expect(source).toContain('onError: "continueRegularOutput",');
		expect(source).toContain('  onError(set({');
	});

	it('keeps a manual trigger with node settings out of its step form, and gives set its settings', () => {
		const json = workflow('Fields', manual(), set({ name: 'Fields', fields: { a: 1 } })).toJSON();
		const withNotes = {
			...json,
			nodes: json.nodes.map((n) => ({ ...n, notes: `About ${n.name}` })),
		};
		const { source, rebuilt } = roundTrip(withNotes);
		expect(source).not.toContain('manual(');
		expect(source).toContain('set({');
		expect(source).toContain('notes: "About Fields",');
		expect(withoutIds(rebuilt)).toEqual(withoutIds(withNotes));
	});

	it('gives undefined for provider wiring the typed format cannot express', () => {
		const model = (name: string) =>
			provider({ name, type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2 });
		const json = workflow(
			'Answer',
			manual(),
			node({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 2.2,
				providers: { model: model('Model') },
			}),
		).toJSON();
		const fallback = {
			...json,
			nodes: [...json.nodes, { ...json.nodes[2], id: 'f', name: 'Fallback' }],
			connections: {
				...json.connections,
				Fallback: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 1 }]] },
			},
		};
		const twoModels = {
			...fallback,
			connections: {
				...json.connections,
				Fallback: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			},
		};
		expect(decompileWorkflow(json, factories)).toContain('model: provider({');
		expect(decompileWorkflow(fallback, factories)).toBeUndefined();
		expect(decompileWorkflow(twoModels, factories)).toBeUndefined();
	});

	it('gives undefined for what the typed format cannot express', () => {
		const json = notionWorkflow().toJSON();
		const [trigger, pages] = json.nodes;
		const secondInput = {
			...json,
			connections: {
				...json.connections,
				[trigger.name ?? '']: { main: [[{ node: pages.name ?? '', type: 'main', index: 1 }]] },
			},
		};
		const disabled = {
			...json,
			nodes: json.nodes.map((n) => (n === pages ? { ...n, disabled: true } : n)),
		};
		const sticky = {
			...json,
			nodes: [
				...json.nodes,
				{
					id: 's',
					name: 'Note',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: { content: 'hi' },
				},
			],
		};
		expect(decompileWorkflow(secondInput, factories)).toBeUndefined();
		expect(decompileWorkflow(disabled, factories)).toBeUndefined();
		expect(decompileWorkflow(sticky, factories)).toBeUndefined();
	});
});

describe('locateNextNodes', () => {
	it('finds the line of each node call', () => {
		const source = decompileWorkflow(branchWorkflow().toJSON(), factories) ?? '';
		const lines = source.split('\n');
		const located = locateNextNodes(source);
		expect(located.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['Run', 'Tasks', 'Has owner?', 'Report', 'Log', 'Unowned', 'Notify']),
		);
		for (const { name, line } of located) {
			const text = lines[line - 1] ?? '';
			expect(text.includes(`name: ${JSON.stringify(name)}`) || text.includes('({')).toBe(true);
		}
		expect(lines[(located.find(({ name }) => name === 'Has owner?')?.line ?? 0) - 1]).toContain(
			'when({',
		);
	});

	it('names the type of a node() call only', () => {
		const located = locateNextNodes(`workflow('Mail', manual(),
	node({ name: 'Mail', type: 'n8n-nodes-base.gmail', version: 2.1 }),
	set({ name: 'Fields', fields: {} }));`);
		expect(located).toEqual([
			{ name: 'Mail', line: 2, type: 'n8n-nodes-base.gmail' },
			{ name: 'Fields', line: 3 },
		]);
	});

	it('does not name the type of a typed step with a type field', () => {
		expect(
			locateNextNodes("workflow('W', manual(), crypto.execute({ name: 'Hash', type: 'SHA256' }));"),
		).toEqual([{ name: 'Hash', line: 1 }]);
	});
});
