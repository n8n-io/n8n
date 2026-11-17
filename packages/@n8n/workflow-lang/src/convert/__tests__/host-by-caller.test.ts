/**
 * One node in the host does not change the conversion of the other nodes: a node that the
 * caller puts in the host (`NodeSources.runsInHost`), and a node whose source makes the node
 * compiler fail. Also the first statement of an expression body, and the item index of the
 * Stop and Error node.
 */
import { compile } from '../../compiler/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { convertWorkflow } from '../index.ts';

interface TestNode {
	name: string;
	type: string;
	typeVersion: number;
	parameters: Record<string, unknown>;
	credentials?: Record<string, unknown>;
}

function workflow(nodes: TestNode[]) {
	const all = [
		{ name: 'Hook', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'p' } },
		...nodes,
	].map((node, k) => ({ ...node, position: [200 * k, 0] }));
	const connections: Record<string, unknown> = {};
	for (let k = 0; k + 1 < all.length; k++) {
		connections[all[k].name] = { main: [[{ node: all[k + 1].name, type: 'main', index: 0 }]] };
	}
	return { name: 'Flow', nodes: all, connections };
}

const sources = (over: Partial<NodeSources>): NodeSources => ({
	entry: () => undefined,
	readFile: () => undefined,
	description: () => undefined,
	verified: {},
	...over,
});

const rows: TestNode = {
	name: 'Rows',
	type: 'n8n-nodes-base.googleSheets',
	typeVersion: 4.7,
	parameters: {
		authentication: 'serviceAccount',
		resource: 'sheet',
		operation: 'read',
		documentId: { __rl: true, mode: 'id', value: 'doc1' },
		sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
		options: {},
	},
	credentials: { googleApi: { id: 'c1', name: 'Robot' } },
};
const request: TestNode = {
	name: 'Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	parameters: { url: 'https://api.example.test/items', options: {} },
};
const setOf = (value: string): TestNode => ({
	name: 'Fields',
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	parameters: {
		assignments: { assignments: [{ id: '1', name: 'a', value, type: 'string' }] },
		options: {},
	},
});

describe('a node that the caller puts in the host', () => {
	it('runs a library node in the host, without a token request', () => {
		const out = convertWorkflow(workflow([rows, request]), {
			nodeSources: sources({ runsInHost: (name) => name === 'Rows' }),
		});
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.fallbackNodes).toEqual(['Rows']);
		expect(out.credentialMints).toBeUndefined();
	});

	it('keeps the library node when the caller does not name it', () => {
		const out = convertWorkflow(workflow([rows, request]), {
			nodeSources: sources({ runsInHost: () => false }),
		});
		expect(out.fallbackNodes).toEqual([]);
		expect(Object.keys(out.credentialMints ?? {})).toEqual(['robot']);
	});

	it('runs an HTTP Request node in the host', () => {
		const out = convertWorkflow(workflow([request, setOf('x')]), {
			nodeSources: sources({ runsInHost: (name) => name === 'Request' }),
		});
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.fallbackNodes).toEqual(['Request']);
	});
});

describe('a node whose source makes the node compiler fail', () => {
	it('runs in the host, and the conversion of the workflow has a result', () => {
		const archive: TestNode = {
			name: 'Archive',
			type: 'n8n-nodes-base.slack',
			typeVersion: 2.3,
			parameters: {
				resource: 'channel',
				operation: 'archive',
				channelId: { __rl: true, mode: 'id', value: 'C1' },
			},
			credentials: { slackApi: { id: 'c2', name: 'Bot' } },
		};
		const out = convertWorkflow(workflow([archive, request]), {
			nodeSources: sources({
				entry: () => {
					throw new TypeError('no entry');
				},
			}),
		});
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.fallbackNodes).toEqual(['Archive']);
		expect(out.diagnostics).toContainEqual(
			expect.objectContaining({
				code: 'node-compile',
				node: 'Archive',
				message: 'The node source does not compile: no entry',
			}),
		);
	});
});

describe('the first statement of an expression body', () => {
	const converted = (value: string) => convertWorkflow(workflow([setOf(value)]));

	it.each(['={{ $json.a; }}', '={{ $json.a\n$json.b }}', '={{ $json.a; $json.b }}'])(
		'is the value of %j, as in v1',
		(value) => {
			const out = converted(value);
			expect(out.ok).toBe(true);
			expect(out.fallbackNodes).toEqual([]);
			expect(out.diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
			expect(out.source).not.toContain('$json.b');
		},
	);

	it.each(['={{ ; $json.a }}', '={{ function () { return 1 }() }}', '={{ {a: 1}; }}'])(
		'gives the body %j to the host, where v1 reports the syntax',
		(value) => {
			const out = converted(value);
			expect(out.diagnostics.some((d) => d.message.includes('syntax'))).toBe(true);
		},
	);

	it('does not take a body with a declaration after the first statement', () => {
		const out = converted('={{ $json.a; var b = 2 }}');
		expect(out.diagnostics.some((d) => d.message.includes('syntax'))).toBe(true);
	});
});

describe('the item index in a Stop and Error node', () => {
	it('is the index of the first item', () => {
		const stop: TestNode = {
			name: 'Stop',
			type: 'n8n-nodes-base.stopAndError',
			typeVersion: 1,
			parameters: { errorMessage: '={{ $itemIndex }}: {{ $json.reason }}' },
		};
		const out = convertWorkflow(workflow([stop]));
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.fallbackNodes).toEqual([]);
		expect(out.source).toContain('const i = 0;');
	});
});
