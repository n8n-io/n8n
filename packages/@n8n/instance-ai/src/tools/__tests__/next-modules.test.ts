import { composedTargetOf, nodeTypeOf } from '@n8n/nodes-base-next';

import {
	catalogRowsBesideModules,
	findNextActions,
	nearestNextActions,
	nextActions,
	nextNodeIdOfNodeType,
	nextNodeModule,
	nextNodeView,
	nodeModuleText,
	searchNextActions,
} from '../next-modules';

describe('next-modules', () => {
	it.each(nextActions.map((action) => [action.id, action] as const))(
		'generates the %s factory into its node module',
		(_id, action) => {
			const text = nodeModuleText(action.node.id);

			expect(text).toContain(`export const ${action.node.id} = {`);
			expect(text).toContain(
				JSON.stringify(composedTargetOf(action)?.nodeType ?? nodeTypeOf(action)),
			);
		},
	);

	it('builds the composed Notion v4 node for an action that owns its slot', () => {
		expect(nodeModuleText('notion')).toContain(
			'contractStep("n8n-nodes-base.notion", config, 4, {"resource":"databasePage","operation":"getAll"})',
		);
	});

	it('has no module for a node without actions', () => {
		expect(nodeModuleText('slack')).toBeUndefined();
		expect(nextNodeModule('slack.message.send')).toBeUndefined();
	});

	it.each([
		'notion',
		'notion.databasePage.getAll',
		'@n8n/nodes-base-next.notionDatabasePageGetAll',
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
		['@n8n/nodes-base-next.httpRequestSend', 'httpRequest'],
		['n8n-nodes-base.slack', undefined],
		['@n8n/n8n-nodes-langchain.notion', undefined],
	])('maps the catalog node type %s to the module node %s', (nodeType, nodeId) => {
		expect(nextNodeIdOfNodeType(nodeType)).toBe(nodeId);
	});

	it('ranks the action that the query names first', () => {
		expect(findNextActions('notion get many pages')[0]?.id).toBe('notion.databasePage.getAll');
		expect(findNextActions('slack')).toEqual([]);
	});

	it('inlines only nodes the query names and keeps other matches to one line', () => {
		expect(searchNextActions('http request')).toEqual({
			nodes: ['httpRequest'],
			actions: ['httpRequest.get', 'httpRequest.send'],
			otherActions: [],
			coversQuery: true,
		});
		const slack = searchNextActions('slack send');
		expect(slack.nodes).toEqual([]);
		expect(slack.otherActions).toContain(
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
		expect(searchNextActions('slack').coversQuery).toBe(false);
	});

	it('names only the node that matches the most node words', () => {
		expect(searchNextActions('google sheets append row').nodes).toEqual(['googleSheets']);
		expect(searchNextActions('notion and google sheets').nodes).toEqual(['googleSheets', 'notion']);
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
		expect(view?.module).toContain('  send: <In, Ctx, const N extends string>(');
		expect(view?.module).not.toContain('export type GmailMessageGetAllInput');
		expect(view?.module).toContain(
			'// gmail.message.getAll(config: GmailMessageGetAllInput) — Get many messages (read, 1:N)\n',
		);
		expect(view?.module).toContain('type-definition "gmail"');
		expect(view!.module.length).toBeLessThan(nodeModuleText('gmail')!.length / 2);
	});

	it('shows the whole module when all or none of its actions are shown', () => {
		const all = new Set(['httpRequest.get', 'httpRequest.send']);
		expect(nextNodeView('httpRequest', all)).toEqual(nextNodeModule('httpRequest'));
		expect(nextNodeView('httpRequest', new Set())).toEqual(nextNodeModule('httpRequest'));
		expect(nextNodeView('slack', all)).toBeUndefined();
	});

	it('lists the actions of module nodes that the catalog search found', () => {
		expect(searchNextActions('tasks', ['notion']).otherActions).toEqual([
			'notion.databasePage.getAll: List pages of a Notion database, optionally filtered and sorted.',
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
		['slack.message.send', ['httpRequest.send']],
		['n8n-nodes-base.unknown', []],
	])('returns the nearest actions for %s', (id, ids) => {
		expect(
			nearestNextActions(id)
				.map((action) => action.id)
				.slice(0, ids.length),
		).toEqual(ids);
	});
});
