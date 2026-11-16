import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { GymAdmin } from '../gym-admin';
import { LinearHydrator } from '../hydrator';
import type { McpCaller } from '../mcp-upstream';
import { NotionHydrator } from '../notion-hydrator';

const textResult = (text: string): CallToolResult => ({ content: [{ type: 'text', text }] });
const jsonResult = (v: unknown): CallToolResult => textResult(JSON.stringify(v));

const DS = 'ee1efedd-db1e-4a18-8793-1cec6dfcf240';
const DB = '5c829216-eaff-46c5-a398-63861118c95d';
const ROW = '3fa5b6e0-c94f-8117-b536-d57495f7890f';

function setup(upstream: Record<string, (args: Record<string, unknown>) => CallToolResult> = {}) {
	const seeds: Array<Record<string, any>> = [];
	const events: unknown[] = [];
	const admin = {
		seed: async (_t: string, overlay: Record<string, any>) => {
			seeds.push(overlay);
		},
		event: async (_t: string, e: unknown) => {
			events.push(e);
		},
	} as unknown as GymAdmin;
	const caller = {
		callTool: async (name: string, args: Record<string, unknown>) =>
			upstream[name]?.(args) ?? { isError: true, content: [] },
	} as unknown as McpCaller;
	return { seeds, events, admin, caller };
}

// Real Notion wraps a fetch result as JSON with the markup in `text`.
const envelope = (inner: string, url = `collection://${DS}`) =>
	jsonResult({ metadata: { type: 'page' }, title: 'T', url, text: inner });

const dataSource = `<data-source url="{{collection://${DS}}}">
<data-source-state>
{"name":"Tracker","schema":{"Name":{"type":"title"},"Notes":{"type":"text"},"Due":{"type":"date"},
"Tags":{"type":"multi_select"},"Owner":{"type":"person"},"Rel":{"type":"relation"}}}
</data-source-state>
</data-source>`;

describe('NotionHydrator', () => {
	it('seeds a data source from the JSON envelope and its double-brace url', async () => {
		const { seeds, admin, caller } = setup();
		const h = new NotionHydrator({ admin, tenant: 't', upstream: caller });
		await h.hydrate('notion-fetch', { id: `collection://${DS}` }, envelope(dataSource));
		const db = seeds[0].native.notion.databases[0];
		expect(db.data_source_id).toBe(DS);
		// `text` becomes `rich_text`. People and relations are not copied.
		expect(db.properties).toEqual({
			Name: 'title',
			Notes: 'rich_text',
			Due: 'date',
			Tags: 'multi_select',
		});
	});

	it('seeds a database page under its own id', async () => {
		const { seeds, admin, caller } = setup();
		const h = new NotionHydrator({ admin, tenant: 't', upstream: caller });
		const inner = `<database url="https://www.notion.so/Tracker-${DB.replaceAll('-', '')}">\n${dataSource}\n</database>`;
		await h.hydrate('notion-fetch', { id: DB }, envelope(inner, 'https://www.notion.so/x'));
		expect(seeds[0].native.notion.databases[0].id).toBe(DB);
	});

	it('copies date, multi-select and text cells from query rows', async () => {
		const { seeds, admin, caller } = setup({ 'notion-fetch': () => envelope(dataSource) });
		const h = new NotionHydrator({ admin, tenant: 't', upstream: caller });
		const row = {
			Name: 'Row',
			Notes: 'hello',
			'date:Due:start': '2026-03-04',
			'date:Due:end': '2026-03-09',
			Tags: '["a","b"]',
			Owner: '["user://x"]',
			url: `https://www.notion.so/Row-${ROW.replaceAll('-', '')}`,
		};
		await h.hydrate(
			'notion-query-data-sources',
			{ data: { data_source_url: `collection://${DS}` } },
			jsonResult({ results: [row] }),
		);
		const seeded = seeds[0].native.notion.databases[0].rows[0];
		expect(seeded.id).toBe(ROW);
		expect(seeded.properties).toEqual({
			Name: 'Row',
			Notes: 'hello',
			Due: { start: '2026-03-04', end: '2026-03-09' },
			Tags: ['a', 'b'],
		});
	});

	it('seeds a fetched row page as a row of its data source', async () => {
		const { seeds, admin, caller } = setup({ 'notion-fetch': () => envelope(dataSource) });
		const h = new NotionHydrator({ admin, tenant: 't', upstream: caller });
		const inner = `<page url="https://www.notion.so/Row-${ROW.replaceAll('-', '')}">
<ancestor-path>
<data-source url="{{collection://${DS}}}" name="Tracker"/>
</ancestor-path>
<properties>
{"title":"Row","Notes":"hi","date:Due:start":"2026-01-02"}
</properties>
<content>
Body text
</content>
</page>`;
		await h.hydrate('notion-fetch', { id: ROW }, envelope(inner, 'https://www.notion.so/x'));
		const rows = seeds.at(-1)?.native.notion.databases[0].rows;
		expect(rows[0]).toMatchObject({
			id: ROW,
			body: 'Body text',
			properties: { Name: 'Row', Notes: 'hi', Due: { start: '2026-01-02' } },
		});
	});

	it('adds the body of a row that a query seeded first', async () => {
		const { events, admin, caller } = setup({ 'notion-fetch': () => envelope(dataSource) });
		const h = new NotionHydrator({ admin, tenant: 't', upstream: caller });
		await h.hydrate(
			'notion-query-data-sources',
			{ data: { data_source_url: `collection://${DS}` } },
			jsonResult({
				results: [{ Name: 'R', url: `https://www.notion.so/R-${ROW.replaceAll('-', '')}` }],
			}),
		);
		const inner = `<page url="https://www.notion.so/R-${ROW.replaceAll('-', '')}">
<ancestor-path><data-source url="{{collection://${DS}}}"/></ancestor-path>
<properties>{"title":"R"}</properties>
<content>
Body text
</content>
</page>`;
		await h.hydrate('notion-fetch', { id: ROW }, envelope(inner, 'https://www.notion.so/x'));
		expect(events).toEqual([{ type: 'append_blocks', page: ROW, markdown: 'Body text' }]);
	});

	it('does not fail a read when one target cannot be seeded', async () => {
		const { admin, caller } = setup();
		const failing = {
			...admin,
			seed: async () => {
				throw new Error('boom');
			},
		} as unknown as GymAdmin;
		const h = new NotionHydrator({ admin: failing, tenant: 't', upstream: caller });
		await expect(
			h.hydrate('notion-fetch', { id: `collection://${DS}` }, envelope(dataSource)),
		).resolves.toBeUndefined();
	});
});

describe('LinearHydrator', () => {
	const team = { id: '11111111-1111-4111-8111-111111111111', key: 'TRU', name: 'AI Trust' };
	const project = {
		id: 'langtracer-abc',
		uuid: '22222222-2222-4222-8222-222222222222',
		name: 'Langtracer',
		summary: 'S',
	};
	const linearUpstream = {
		get_team: () => jsonResult(team),
		list_issue_statuses: () => jsonResult([{ id: 'x', name: 'Todo', type: 'unstarted' }]),
	};

	it('does not treat a project uuid as an issue', async () => {
		const { seeds, admin, caller } = setup(linearUpstream);
		const h = new LinearHydrator({ admin, tenant: 't', upstream: caller });
		await h.hydrate('get_project', { query: 'Langtracer' }, jsonResult(project));
		// No issue read was attempted, so the project is seeded on its own.
		expect(seeds).toHaveLength(1);
		expect(seeds[0].native.linear.projects[0]).toMatchObject({
			id: project.uuid,
			name: 'Langtracer',
		});
		expect(seeds[0].native.linear.teams).toHaveLength(1);
	});

	it('seeds a team with its statuses for a standalone team read', async () => {
		const { seeds, admin, caller } = setup(linearUpstream);
		const h = new LinearHydrator({ admin, tenant: 't', upstream: caller });
		await h.hydrate('get_team', { query: 'AI Trust' }, jsonResult(team));
		const t = seeds[0].native.linear.teams[0];
		expect(t).toMatchObject({ id: team.id, key: 'TRU', name: 'AI Trust' });
		expect(t.states).toHaveLength(1);
	});

	it('seeds the team and labels of a standalone label list', async () => {
		const { seeds, admin, caller } = setup(linearUpstream);
		const h = new LinearHydrator({ admin, tenant: 't', upstream: caller });
		await h.hydrate(
			'list_issue_labels',
			{ team: 'AI Trust' },
			jsonResult({ labels: [{ id: 'l1', name: 'bug', color: '#f00' }] }),
		);
		expect(seeds[0].native.linear.teams).toHaveLength(1);
		expect(seeds[0].native.linear.labels[0]).toMatchObject({ name: 'bug' });
	});
});
