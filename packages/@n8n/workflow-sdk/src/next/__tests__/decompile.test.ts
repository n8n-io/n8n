import vm from 'node:vm';

import type { WorkflowJSON } from '../../types/base';
import { decompileWorkflow, locateNextNodes, type ContractFactory } from '../decompile';
import * as next from '../index';
import { contractStep, manual, node, set, workflow, type Dollar, type Step } from '../index';

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
		}): Step<In, Ctx, Page, N> => contractStep(NOTION_TYPE, config),
	},
};

const httpRequest = {
	send: <In, Ctx, const N extends string>(config: {
		name: N;
		method: 'POST' | 'PUT';
		url: string;
		body?: { kind: 'json'; json: (item: In, $: Dollar<Ctx>) => object };
	}): Step<In, Ctx, { ok: boolean }, N> => contractStep(SEND_TYPE, config),
};

const factories = new Map<string, ContractFactory>([
	[
		NOTION_TYPE,
		{
			module: 'notion',
			from: '@n8n/nodes/notion',
			path: 'databasePage.getAll',
			version: 1,
			inputKeys: ['database', 'where', 'limit', 'sort'],
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
		},
	],
]);

const modules: Record<string, unknown> = {
	'@n8n/workflow-sdk/next': next,
	'@n8n/nodes/notion': { notion },
	'@n8n/nodes/httpRequest': { httpRequest },
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

function roundTrip(json: WorkflowJSON) {
	const source = decompileWorkflow(json, factories);
	if (source === undefined) throw new Error('workflow did not decompile');
	const rebuilt = build(source);
	return { source, rebuilt, again: decompileWorkflow(rebuilt, factories) };
}

const DATABASE = '5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e';

const notionWorkflow = () =>
	workflow(
		'Notion done pages report',
		manual()
			.andThen(
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
			)
			.andThen(
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
			),
	);

const branchWorkflow = () =>
	workflow(
		'Report owners',
		manual({ name: 'Run' })
			.andThen(notion.databasePage.getAll({ name: 'Tasks', database: DATABASE }))
			.branch({
				name: 'Has owner?',
				if: (page) => page.property_owners.length > 0,
				then: (flow) =>
					flow
						.andThen(
							httpRequest.send({
								name: 'Report',
								method: 'POST',
								url: 'https://x.example.com',
								body: { kind: 'json', json: (page, $) => ({ id: page.id, first: $('Tasks').id }) },
							}),
						)
						.orElse((failed) =>
							failed.andThen(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
						),
				else: (flow) =>
					flow.andThen(
						set({
							name: 'Unowned',
							fields: { id: (page) => page.id, source: 'notion' },
							keep: 'all',
						}),
					),
			})
			.andThen(
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
			),
	);

describe('decompileWorkflow', () => {
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

	it('round-trips a branch, an error output, a join, and the node() escape hatch', () => {
		const json = branchWorkflow().toJSON();
		const { source, rebuilt, again } = roundTrip(json);

		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(again).toBe(source);
		expect(source).toContain('.branch({');
		expect(source).toContain('if: (item) => item.property_owners.length > 0,');
		expect(source).toContain('.orElse((failed) => failed');
		expect(source).toContain('keep: "all"');
		expect(source).toContain('source: "notion"');
		expect(source).toContain('first: $("Tasks").id');
		expect(source).toContain('text: (_item, $) => `Done: ${$("Tasks").id}`,');
		// No lambda compiles to $input, and node() takes no lambda directly in an array.
		expect(source).toContain('raw: "={{ $input.first().json.id }}",');
		// A template literal would read as a string, and ({ … }) compiles to other text.
		expect(source).toContain('object: "={{ { \\"id\\": $json.id } }}",');
		expect(source).toContain('"={{ $json.id }}",');
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

	it('keeps a contract node with a raw expression or another version in node()', () => {
		const json = notionWorkflow().toJSON();
		const changed = {
			...json,
			nodes: json.nodes.map((n) =>
				n.type === NOTION_TYPE
					? { ...n, parameters: { ...n.parameters, database: '={{ $input.first().json.db }}' } }
					: n.type === SEND_TYPE
						? { ...n, typeVersion: 2 }
						: n,
			),
		};
		const { source, rebuilt } = roundTrip(changed);
		expect(source).toContain(`type: "${NOTION_TYPE}"`);
		expect(source).toContain(`type: "${SEND_TYPE}"`);
		expect(source).not.toContain('@n8n/nodes/');
		expect(withoutIds(rebuilt)).toEqual(withoutIds(changed));
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
		const retry = {
			...json,
			nodes: json.nodes.map((n) => (n === pages ? { ...n, retryOnFail: true } : n)),
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
					notes: 'x',
				},
			],
		};
		expect(decompileWorkflow(secondInput, factories)).toBeUndefined();
		expect(decompileWorkflow(retry, factories)).toBeUndefined();
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
			'.branch({',
		);
	});
});
