import { validate } from '@n8n/node-sdk';
import * as flowSdk from '@n8n/workflow-sdk/next';
import { FIRST_PARTY_PACKAGES, forEach, manual, set, workflow } from '@n8n/workflow-sdk/next';

import { entryOf, firstPartyCatalog, migratedTargetOf, nodeTypeOf } from '../contract-catalog';

import {
	CORE_NODE_STEPS,
	coreStepRowOf,
	catalogRowsBesideModules,
	contractReplacementOf,
	findNextActions,
	flowStepRowOf,
	missingNodeTypeIssue,
	namesDisplayName,
	nearestNextActions,
	nextActions,
	nextNodeIdOfNodeType,
	nextNodeIds,
	supplierActionsOf,
	nextNodeModule,
	nextNodeView,
	nodeModuleText,
	searchNextActions,
} from '../next-modules';

describe('next-modules', () => {
	it.each(
		nextActions()
			.filter(({ inputs }) => !inputs)
			.map((action) => [action.id, action] as const),
	)('generates the %s factory into its node module', (_id, action) => {
		const text = nodeModuleText(action.node.id);

		expect(text).toContain(`export const ${action.node.id} = {`);
		expect(text).toContain(
			JSON.stringify(migratedTargetOf(action)?.nodeType ?? nodeTypeOf(action)),
		);
	});

	it.each(
		nextActions()
			.filter(({ inputs }) => inputs)
			.map((action) => [action.id, action] as const),
	)('names the %s join in its node module, which a flow region builds', (_id, action) => {
		const text = nodeModuleText(action.node.id);

		expect(text).toContain(`// ${action.id}: ${action.action}.`);
		expect(text).not.toContain(nodeTypeOf(action));
	});

	it('names the inputs of each Merge join: a count of 2 to 10, or left and right', () => {
		const text = nodeModuleText('merge') ?? '';

		expect(text).toContain('// merge.append: Append items.');
		expect(text).toContain('// merge.combineByPosition: Combine items by position.');
		expect(text.match(/\(inputs: 2 to 10, set by inputs\)/g)).toHaveLength(2);
		expect(text).toContain('(inputs: left, right)');
	});

	it('builds the composed Notion v4 node for an action that owns its slot', () => {
		expect(nodeModuleText('notion')).toContain(
			'contractStep("n8n-nodes-base.notion", config, 4, {"resource":"databasePage","operation":"getAll"}, {"credential":"notion","scopes":["content:read"]})',
		);
	});

	it('tells the Notion page ID apart from the key of a database property', () => {
		const text = nodeModuleText('notion');
		expect(text).toContain(
			'export type NotionDatabasePageGetAllOutput = {\n /** Notion page UUID, not a database property */\n id: string;',
		);
		expect(text).toContain(
			' /**\n  * property_ + snake_case of the property name, e.g. "Order ID": property_order_id\n  * Value by property type:',
		);
	});

	it('adds the triggers of a node, so a workflow can start at one', () => {
		expect(nodeModuleText('notion')).toContain(
			'contractTrigger("@n8n/nodes-integrations.notionDataSourcePageAdded", config, 1, {"credential":"notion","scopes":["content:read"]}, {"example":{"id":"example"}})',
		);
		expect(nextNodeModule('github.repository.event')?.module).toContain(
			'): Trigger<OutputOf<N, GithubRepositoryEventOutput>, N> =>',
		);
	});

	it.each([
		['n8n-nodes-base.sort', 'items', 'items.sort'],
		['n8n-nodes-base.if', 'condition', 'condition.if'],
	])('replaces %s with the action of the same name', (type, nodeId, actionId) => {
		const replacement = contractReplacementOf({ type });

		expect(replacement?.nodeId).toBe(nodeId);
		expect(replacement?.actions.map(({ id }) => id)).toEqual([actionId]);
		expect(replacement?.exact).toBe(true);
	});

	it('offers the flow step, not the module action that the step emits', () => {
		const hidden = ['items.set', 'merge.append', 'merge.combine', 'merge.combineByPosition'];
		expect(nextNodeIds).toContain('items');
		expect(nextNodeIds).not.toContain('merge');
		expect(searchNextActions('merge branches').nodes).toEqual([]);
		expect(searchNextActions('merge branches', [], ['merge']).nodes).toEqual([]);
		const found = ['edit fields', 'set fields', 'merge'].flatMap((query) =>
			findNextActions(query).map(({ id }) => id),
		);
		expect(found.filter((id) => hidden.includes(id))).toEqual([]);
		expect(nearestNextActions('items.set').map(({ id }) => id)).not.toContain('items.set');
		expect(contractReplacementOf({ type: 'n8n-nodes-base.set' })).toBeUndefined();
	});

	it('types a module without the hidden actions, and keeps them in the sandbox module', () => {
		expect(nextNodeModule('items')?.module).not.toContain('"@n8n/nodes-core.itemsSet"');
		expect(nextNodeModule('items')?.module).toContain('"@n8n/nodes-core.itemsSort"');
		expect(nodeModuleText('items')).toContain('contractStep("@n8n/nodes-core.itemsSet"');
		expect(nodeModuleText('merge')).toContain('// merge.append: Append items.');
	});

	it.each([
		['items.set', 'set({'],
		['@n8n/nodes-core.itemsSet', 'set({'],
		['merge', 'merge({'],
		['merge.combineByPosition', 'merge({'],
	])('points %s to its flow step', (ref, step) => {
		expect(nextNodeModule(ref)).toBeUndefined();
		expect(flowStepRowOf(ref)).toContain(step);
	});

	it.each(['items', 'items.sort', 'notion'])('has no flow step for %s', (ref) => {
		expect(flowStepRowOf(ref)).toBeUndefined();
	});

	it('has no module for a node without actions', () => {
		expect(nodeModuleText('mattermost')).toBeUndefined();
		expect(nextNodeModule('mattermost.message.post')).toBeUndefined();
	});

	it.each([
		'notion',
		'notion.databasePage.getAll',
		'@n8n/nodes-integrations.notionDatabasePageGetAll',
	])('resolves %s to the notion module', (ref) => {
		expect(nextNodeModule(ref)).toEqual({
			node: 'notion',
			import: "import { notion } from '@n8n/nodes/notion';",
			module: nodeModuleText('notion'),
		});
	});

	it.each([
		['n8n-nodes-base.notion', 'notion'],
		['n8n-nodes-base.httpRequest', 'httpRequest'],
		['@n8n/nodes-core.httpRequestSend', 'httpRequest'],
		['n8n-nodes-base.slack', 'slack'],
		['n8n-nodes-base.mattermost', undefined],
		['@n8n/n8n-nodes-langchain.notion', undefined],
		['@n8n/n8n-nodes-langchain.lmChatOpenAi', 'openAi'],
		['@n8n/n8n-nodes-langchain.agent', undefined],
		['@n8n/n8n-nodes-langchain.openAi', undefined],
		['@n8n/n8n-nodes-langchain.googleGemini', undefined],
		['@n8n/n8n-nodes-langchain.chainLlm', 'ai'],
		['@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 'googleGemini'],
		['n8n-nodes-base.webhook', 'webhook'],
		['n8n-nodes-base.respondToWebhook', 'webhook'],
		['n8n-nodes-base.scheduleTrigger', 'schedule'],
		['n8n-nodes-base.formTrigger', 'form'],
		['n8n-nodes-base.whatsAppTrigger', 'whatsAppTrigger'],
		['n8n-nodes-base.facebookTrigger', 'facebookTrigger'],
		['n8n-nodes-base.manualTrigger', undefined],
		['n8n-nodes-base.slackTool', 'slack'],
		['n8n-nodes-base.httpRequestTool', 'httpRequest'],
		['n8n-nodes-base.mattermostTool', undefined],
		['@n8n/nodes-core.httpRequestGetTool', 'httpRequest'],
	])('maps the catalog node type %s to the module node %s', (nodeType, nodeId) => {
		expect(nextNodeIdOfNodeType(nodeType)).toBe(nodeId);
	});

	it.each([
		['webhook trigger', ['webhook']],
		['schedule trigger', ['schedule']],
		['form trigger', ['form']],
		['WhatsApp trigger', ['whatsAppTrigger']],
		['facebook trigger', ['facebookTrigger']],
		['manual trigger', []],
	])('names the module of a native trigger for %s', (query, nodes) => {
		expect(searchNextActions(query).nodes).toEqual(nodes);
	});

	it('covers a trigger query with the words of the trigger', () => {
		expect(searchNextActions('webhook trigger').coversQuery).toBe(true);
	});

	it('names the module nodes whose catalog display name the query names', () => {
		expect(searchNextActions('basic llm chain', ['ai'], ['ai'])).toMatchObject({
			nodes: ['ai'],
			otherActions: [],
		});
	});

	it.each(CORE_NODE_STEPS.flatMap(({ nodeType, steps }) => steps.map((step) => [step, nodeType])))(
		'names the SDK step %s for %s, which the flow SDK has',
		(step, nodeType) => {
			expect(step in flowSdk).toBe(true);
			expect(coreStepRowOf(nodeType)).toContain(`${step}({`);
		},
	);

	it('has no SDK step row for a node type that a module types', () => {
		expect(coreStepRowOf('n8n-nodes-base.webhook')).toBeUndefined();
		expect(coreStepRowOf('n8n-nodes-base.mattermost')).toBeUndefined();
	});

	it('finds the chat model sub-nodes of module nodes for a sub-node search', () => {
		expect(
			supplierActionsOf(['openAi', 'ai', 'openAi'], 'ai_languageModel').map(({ id }) => id),
		).toEqual(['openAi.chatModel']);
		expect(supplierActionsOf(['openAi'], 'ai_tool')).toEqual([]);
		expect(supplierActionsOf(['httpRequest'], 'ai_tool').map(({ id }) => id)).toEqual([
			'httpRequest.get',
			'httpRequest.send',
		]);
	});

	it('finds the catalog nodes whose display name the query names', () => {
		expect(namesDisplayName('AI agent with tools', 'AI Agent')).toBe(true);
		expect(namesDisplayName('AI agent', 'AI Agent Tool')).toBe(false);
		expect(namesDisplayName('notion get many database pages', 'Notion Trigger')).toBe(false);
	});

	it('ranks the action that the query names first', () => {
		expect(findNextActions('notion get many pages')[0]?.id).toBe('notion.databasePage.getAll');
		expect(findNextActions('mattermost')).toEqual([]);
	});

	it('inlines only nodes the query names and keeps other matches to one line', () => {
		expect(searchNextActions('http request')).toEqual({
			nodes: ['httpRequest'],
			actions: ['httpRequest.get', 'httpRequest.send', 'httpRequest.download'],
			otherActions: [],
			coversQuery: true,
		});
		const mattermost = searchNextActions('mattermost send');
		expect(mattermost.nodes).toEqual([]);
		expect(mattermost.otherActions).toContain(
			'httpRequest.send: POST, PUT, PATCH, or DELETE to any HTTP API.',
		);
	});

	it('lists no other actions when the query names a module node', () => {
		expect(searchNextActions('notion get many pages', ['gmail', 'googleSheets'])).toEqual({
			nodes: ['notion'],
			actions: ['notion.databasePage.getAll'],
			otherActions: [],
			coversQuery: true,
		});
	});

	it('covers a query only when the named modules match every query word', () => {
		expect(searchNextActions('notion database trigger').coversQuery).toBe(false);
		expect(searchNextActions('mattermost').coversQuery).toBe(false);
	});

	it('names only the node that matches the most node words', () => {
		expect(searchNextActions('google sheets append row').nodes).toEqual(['googleSheets']);
		expect(searchNextActions('notion and google sheets').nodes).toEqual(['googleSheets', 'notion']);
	});

	it('names a trigger-only node only when the query names more of it than a node with actions', () => {
		expect(searchNextActions('google sheets').nodes).toEqual(['googleSheets']);
		expect(searchNextActions('google sheets trigger').nodes).toEqual(['googleSheetsTrigger']);
	});

	it.each(['split out items', 'limit item', 'if condition', 'check conditions'])(
		'names no node by the generic words of "%s"',
		(query) => {
			expect(searchNextActions(query).nodes).toEqual([]);
		},
	);

	it('matches an inflected query word to the action word it extends', () => {
		expect(searchNextActions('slack sending message').actions).toEqual(['slack.message.send']);
		expect(searchNextActions('slack posting message').actions).toEqual(['slack.message.send']);
	});

	it.each([
		['gmail send message', ['gmail.message.send']],
		['http request post', ['httpRequest.send']],
		[
			'google sheets append row',
			['googleSheets.sheet.append', 'googleSheets.sheet.appendOrUpdate'],
		],
		['gmail', ['gmail.message.send', 'gmail.message.getAll', 'gmail.message.get']],
	])('names the actions of %s that the query singles out', (query, ids) => {
		expect(searchNextActions(query).actions).toEqual(ids);
	});

	it('shows types only for the shown actions and one line for each other action', () => {
		const view = nextNodeView('gmail', new Set(['gmail.message.send']));

		expect(view?.import).toBe("import { gmail } from '@n8n/nodes/gmail';");
		expect(view?.module).toContain('export type GmailMessageSendInput<I, C> = {');
		expect(view?.module).toContain(
			'  send: <In, Ctx, const N extends string, S extends DeepPartial<OutputOf<N, GmailMessageSendOutput>> = never>(',
		);
		expect(view?.module).not.toContain('export type GmailMessageGetAllInput');
		expect(view?.module).toContain(
			'// gmail.message.getAll(config: GmailMessageGetAllInput) — Get many messages (read, 1:N)\n',
		);
		expect(view?.module).toContain('type-definition "gmail"');
		// Send is the largest Gmail action, so its view is about half of the module.
		expect(view!.module.length).toBeLessThan(nodeModuleText('gmail')!.length * 0.6);
	});

	it('types at most three actions of a module in a search view', () => {
		const slack = nextActions().filter(({ node }) => node.id === 'slack');
		const typedOf = (view: string | undefined) =>
			slack.filter(({ id }) => !view?.includes(`// ${id}(config:`)).map(({ id }) => id);

		expect(slack.length).toBeGreaterThan(3);
		expect(typedOf(nextNodeView('slack', new Set())?.module)).toEqual(
			slack.slice(0, 3).map(({ id }) => id),
		);
		expect(
			typedOf(nextNodeView('slack', new Set(slack.slice(-4).map(({ id }) => id)))?.module),
		).toEqual(slack.slice(-4, -1).map(({ id }) => id));
	});

	it('shows the whole module when all or none of its actions are shown', () => {
		const all = new Set(['httpRequest.get', 'httpRequest.send', 'httpRequest.download']);
		expect(nextNodeView('httpRequest', all)).toEqual(nextNodeModule('httpRequest'));
		expect(nextNodeView('httpRequest', new Set())).toEqual(nextNodeModule('httpRequest'));
		expect(nextNodeView('mattermost', all)).toBeUndefined();
	});

	it('lists the actions of module nodes that the catalog search found', () => {
		expect(searchNextActions('tasks', ['notion']).otherActions).toEqual([
			'notion.databasePage.getAll: List pages of a Notion database, optionally filtered and sorted.',
			'notion.user.get: Get one Notion user (a person or a bot) by ID.',
		]);
	});

	it('lists catalog hits beside module nodes as one line each, own triggers first', () => {
		const hits = [
			['n8n-nodes-base.httpRequestTool', 'HTTP Request Tool'],
			['@n8n/n8n-nodes-langchain.toolHttpRequest', 'HTTP Request Tool'],
			['@n8n/mcp-registry.notion', 'Notion MCP'],
			['n8n-nodes-base.oracleDatabase', 'Oracle Database'],
			['n8n-nodes-base.webhook', 'Webhook'],
			['n8n-nodes-base.notionTrigger', 'Notion Trigger'],
			['n8n-nodes-base.metabase', 'Metabase'],
		].map(([name, displayName]) => ({ name, displayName }));

		expect(catalogRowsBesideModules(hits, ['notion', 'httpRequest'])).toEqual([
			'n8n-nodes-base.notionTrigger: Notion Trigger',
			'n8n-nodes-base.oracleDatabase: Oracle Database',
			'n8n-nodes-base.webhook: Webhook',
		]);
		expect(catalogRowsBesideModules(hits.slice(0, 2), ['notion'])).toEqual([
			'n8n-nodes-base.httpRequestTool: HTTP Request Tool',
			'@n8n/n8n-nodes-langchain.toolHttpRequest: HTTP Request Tool',
		]);
	});

	it.each([
		['notion.page.getAll', ['notion.databasePage.getAll']],
		['mattermost.message.send', ['httpRequest.send']],
		['n8n-nodes-base.unknown', []],
	])('returns the nearest actions for %s', (id, ids) => {
		expect(
			nearestNextActions(id)
				.map((action) => action.id)
				.slice(0, ids.length),
		).toEqual(ids);
	});

	it('emits the manual() native contract and a forEach region instead of Loop Over Items', () => {
		const json = workflow(
			'Each',
			manual({ sample: [{ n: 1 }, { n: 2 }] }),
			forEach(
				{ name: 'Each', batchSize: 1 },
				set({ name: 'Mark', fields: { n: (item) => item.n } }),
			),
		).toJSON();
		const flowNatives = ['manual.trigger'].flatMap((id) => {
			const manifest = entryOf(id)?.manifest;
			return manifest && 'native' in manifest ? [manifest] : [];
		});
		const issues = flowNatives.map((native) => {
			const emitted = json.nodes.find(({ type }) => type === native.native.type);
			return [
				native.id,
				emitted?.typeVersion === native.native.version,
				validate(emitted?.parameters ?? {}, native.contract.input, { allowExpressions: true }),
			];
		});
		expect(issues).toEqual([['manual.trigger', true, []]]);
		expect(json.nodes.some(({ type }) => type === 'n8n-nodes-base.splitInBatches')).toBe(false);
		expect(json.nodeGroups).toEqual([
			expect.objectContaining({ name: 'Each', repeat: expect.objectContaining({ batchSize: 1 }) }),
		]);
		expect(flowNatives.map(({ contract }) => nodeModuleText(contract.node))).toEqual([undefined]);
	});
});

describe('next-modules of the first-party packages', () => {
	it('offers the noOp module by search, by its node type and for the legacy node', () => {
		expect(searchNextActions('no operation').nodes).toEqual(['noOp']);
		expect(nextNodeIdOfNodeType('@n8n/nodes-core.noOpPass')).toBe('noOp');
		expect(nodeModuleText('noOp')).toContain('"@n8n/nodes-core.noOpPass"');
		expect(contractReplacementOf({ type: 'n8n-nodes-base.noOp' })).toMatchObject({
			nodeId: 'noOp',
			actions: [{ id: 'noOp.pass' }],
		});
	});

	it('lists the node of each action and trigger of each first-party package', () => {
		// A flow step replaces every action of these nodes; flow natives have no module.
		const replaced = new Set(['merge', 'manual']);
		const nodeIdsOf = (name: string) => [
			...new Set(
				firstPartyCatalog()
					.entries.filter((entry) => entry.package === name)
					.map(({ manifest }) => manifest.contract.node),
			),
		];
		const listed = FIRST_PARTY_PACKAGES.map((name) =>
			nodeIdsOf(name).filter((nodeId) => !replaced.has(nodeId)),
		);
		expect(listed.every((nodeIds) => nodeIds.length > 0)).toBe(true);
		expect([...nextNodeIds].sort()).toEqual(listed.flat().sort());
	});

	it('finds a core node and an integration node, each typed with its package name', () => {
		expect(searchNextActions('http request').nodes).toContain('httpRequest');
		expect(searchNextActions('slack send message').nodes).toContain('slack');
		expect(nodeModuleText('httpRequest')).toContain('"@n8n/nodes-core.httpRequestGet"');
		expect(nodeModuleText('slack')).toContain('"@n8n/nodes-integrations.slackMessageSend"');
	});

	it('does not ask to install a first-party package for a node type that it does not have', () => {
		for (const name of FIRST_PARTY_PACKAGES) {
			expect(missingNodeTypeIssue(`${name}.nope`, {})).toBe(
				`n8n has no node type ${name}.nope. Find the type with nodes(action="search").`,
			);
		}
	});
});
