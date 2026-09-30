import { nodeTypeOf } from '@n8n/nodes-base-next';

import {
	catalogRowsBesideModules,
	findNextActions,
	nearestNextActions,
	nextActions,
	nextNodeIdOfNodeType,
	nextNodeModule,
	nodeModuleText,
	searchNextActions,
} from '../next-modules';

describe('next-modules', () => {
	it.each(nextActions.map((action) => [action.id, action] as const))(
		'generates the %s factory into its node module',
		(_id, action) => {
			const text = nodeModuleText(action.node.id);

			expect(text).toContain(`export const ${action.node.id} = {`);
			expect(text).toContain(JSON.stringify(nodeTypeOf(action)));
		},
	);

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
		expect(searchNextActions('http request')).toEqual({ nodes: ['httpRequest'], otherActions: [] });
		const slack = searchNextActions('slack send');
		expect(slack.nodes).toEqual([]);
		expect(slack.otherActions).toContain(
			'httpRequest.send: POST, PUT, PATCH, or DELETE to any HTTP API.',
		);
	});

	it('lists no other actions when the query names a module node', () => {
		expect(searchNextActions('notion get many pages', ['gmail', 'googleSheets'])).toEqual({
			nodes: ['notion'],
			otherActions: [],
		});
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
