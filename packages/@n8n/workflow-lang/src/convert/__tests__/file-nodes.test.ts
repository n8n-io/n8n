/**
 * The file nodes Extract From File and Convert To File: an operation with a library node is
 * a library call with a host form after it, and each other operation runs in the host.
 */
import { compile } from '../../compiler/index.ts';
import { convertWorkflow } from '../index.ts';

interface TestNode {
	name: string;
	type: string;
	typeVersion: number;
	parameters: Record<string, unknown>;
	onError?: string;
}

function workflow(nodes: TestNode[], settings: Record<string, unknown> = {}) {
	const all = [
		{ name: 'Hook', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'p' } },
		...nodes,
	].map((node, k) => ({ ...node, position: [200 * k, 0] }));
	const connections: Record<string, unknown> = {};
	for (let k = 0; k + 1 < all.length; k++) {
		connections[all[k].name] = { main: [[{ node: all[k + 1].name, type: 'main', index: 0 }]] };
	}
	return { name: 'Flow', nodes: all, connections, settings };
}

const extract = (parameters: Record<string, unknown>, onError?: string): TestNode => ({
	name: 'Extract',
	type: 'n8n-nodes-base.extractFromFile',
	typeVersion: 1.1,
	parameters,
	...(onError ? { onError } : {}),
});
const convert = (parameters: Record<string, unknown>): TestNode => ({
	name: 'Convert',
	type: 'n8n-nodes-base.convertToFile',
	typeVersion: 1.1,
	parameters,
});

describe('file nodes', () => {
	it.each([
		['text', {}],
		['xml', {}],
		['fromJson', { destinationKey: '={{ $json.key }}' }],
		['binaryToPropery', { options: { keepSource: 'both' } }],
	])('lowers Extract From File "%s" to the library node with a host form', (operation, more) => {
		const out = convertWorkflow(workflow([extract({ operation, ...more })]));
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.source).toContain(`operation: '${operation}'`);
		expect(out.source).toContain('destinationKey: ');
		expect(out.source).toContain('fileLimitInHost(error)');
		expect(out.source).toContain("host: 'fallback'");
	});

	it.each([
		['toText', { sourceProperty: 'text' }],
		['toBinary', { sourceProperty: 'data', mode: 'once' }],
		['toJson', { mode: 'each' }],
	])('lowers Convert To File "%s" to the library node with a host form', (operation, more) => {
		const out = convertWorkflow(workflow([convert({ operation, ...more })]));
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.source).toContain('nodeVersion: 1.1');
		expect(out.source).toContain('fileLimitInHost(error)');
	});

	it('compiles under each error setting', () => {
		for (const onError of ['continueRegularOutput', 'continueErrorOutput']) {
			const out = convertWorkflow(workflow([extract({ operation: 'text' }, onError)]));
			expect(out.ok).toBe(true);
			expect(compile(out.source).diagnostics).toEqual([]);
			expect(out.source).toContain('if (fileLimitInHost(error)) throw error;');
		}
	});

	it.each([
		['Extract', extract({})],
		['Extract', extract({ operation: 'pdf' })],
		['Extract', extract({ operation: 'xlsx' })],
		['Convert', convert({})],
		['Convert', convert({ operation: 'toJson' })],
		['Convert', convert({ operation: 'iCal' })],
	])('runs %s in the host for an operation without a library form', (name, node) => {
		const out = convertWorkflow(workflow([node]));
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([name]);
		expect(out.source).not.toContain('fileLimitInHost');
	});

	it('runs a file node in the host when the workflow keeps binary data in the JSON', () => {
		const out = convertWorkflow(
			workflow([extract({ operation: 'text' })], { binaryMode: 'combined' }),
		);
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual(['Extract']);
	});
});
