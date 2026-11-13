/**
 * The proofs that code never reads headers (`headers.ts`): the module meta
 * gets `"triggerHeaders": false`, and steps of library nodes get the flag
 * `resultHeadersUnread`, only when no use can reach the headers.
 */
import { compile } from '../index.ts';
import { decodeModule } from '../decode.ts';

function metaOf(run: string): Record<string, unknown> {
	const source = `import { webhook, workflow } from '@n8n/workflow-lang';
export default workflow({
	triggers: [webhook<{ id: number }>({ path: 'h' })],
	${run}
});
`;
	const out = compile(source);
	expect(out.diagnostics).toEqual([]);
	const m = decodeModule(out.module ?? new Uint8Array());
	const parsed: unknown = JSON.parse(m.meta);
	return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

describe('triggerHeaders', () => {
	it.each([
		['reads the body only', 'async run(_ctx, trigger) { return trigger.body.id; }'],
		['destructures the body', 'async run(_ctx, { body }) { return body.id; }'],
		['has no trigger parameter', 'async run() { return 1; }'],
	])('is false when the workflow %s', (_name, run) => {
		expect(metaOf(run).triggerHeaders).toBe(false);
	});

	it.each([
		['reads the headers', 'async run(_ctx, trigger) { return trigger.headers; }'],
		['returns the trigger', 'async run(_ctx, trigger) { return trigger; }'],
		['passes the trigger on', 'async run(_ctx, trigger) { return JSON.stringify(trigger); }'],
		['aliases the trigger', 'async run(_ctx, trigger) { const t = trigger; return t.body; }'],
		['uses an element access', "async run(_ctx, trigger) { return trigger['body']; }"],
		['destructures the headers', 'async run(_ctx, { headers }) { return headers; }'],
		['destructures a rest', 'async run(_ctx, { body, ...rest }) { return [body, rest]; }'],
		['puts it in an object', 'async run(_ctx, trigger) { return { trigger }; }'],
	])('is absent when the workflow %s', (_name, run) => {
		expect(metaOf(run).triggerHeaders).toBeUndefined();
	});
});

const NODE_FILE = 'nodes/probe.ts';

function stepFlag(httpUse: string): boolean {
	const node = `import { defineNode } from '@n8n/workflow-lang';
export default defineNode<{ resource?: string; operation?: string; url?: string }>({
	type: 'n8n-nodes-base.probe',
	version: 1,
	supports: { operations: { 'probe.get': ['url'] } },
	async run(ctx, parameters) {
		${httpUse}
	},
});
`;
	const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';
export default workflow({
	triggers: [webhook({ path: 'p' })],
	async run(ctx) {
		return await ctx.node({ name: 'Probe', type: 'n8n-nodes-base.probe', typeVersion: 1, parameters: { resource: 'probe', operation: 'get', url: 'https://example.com' } });
	},
});
`;
	const out = compile(workflow, { nodes: { [NODE_FILE]: node } });
	expect(out.diagnostics).toEqual([]);
	const m = decodeModule(out.module ?? new Uint8Array());
	return m.steps.some((s) => s.resultHeadersUnread === true);
}

const request =
	"{ method: 'GET', url: parameters.url ?? '', headers: {}, qs: {}, body: undefined }";

describe('resultHeadersUnread', () => {
	it.each([
		[
			'reads status and body',
			`const r = await ctx.http(${request}); return [{ s: r.status, b: r.body }];`,
		],
		['reads a member at once', `const b = (await ctx.http(${request})).body; return [{ b }];`],
		[
			'destructures status and body',
			`const { status, body } = await ctx.http(${request}); return [{ status, body }];`,
		],
	])('is set when the node %s', (_name, use) => {
		expect(stepFlag(use)).toBe(true);
	});

	it.each([
		['reads the headers', `const r = await ctx.http(${request}); return [{ h: r.headers }];`],
		['returns the response', `const r = await ctx.http(${request}); return [{ r }];`],
		['uses a let binding', `let r = await ctx.http(${request}); return [{ s: r.status }];`],
		[
			'destructures the headers',
			`const { headers } = await ctx.http(${request}); return [{ headers }];`,
		],
		[
			'destructures a rest',
			`const { status, ...rest } = await ctx.http(${request}); return [{ status, rest }];`,
		],
		[
			'passes the response on',
			`const r = await ctx.http(${request}); return [JSON.parse(JSON.stringify(r)) as Record<string, unknown>];`,
		],
	])('is not set when the node %s', (_name, use) => {
		expect(stepFlag(use)).toBe(false);
	});
});

function workflowFlags(use: string): { headers: boolean; body: boolean } {
	const source = `import { webhook, workflow } from '@n8n/workflow-lang';
export default workflow({
	triggers: [webhook({ path: 'p' })],
	async run(ctx) {
		${use}
	},
});
`;
	const out = compile(source);
	expect(out.diagnostics).toEqual([]);
	const m = decodeModule(out.module ?? new Uint8Array());
	const step = m.steps.find((s) => s.name === 'Call');
	return { headers: step?.resultHeadersUnread === true, body: step?.resultBodyUnread === true };
}

const call = "ctx.http({ name: 'Call', method: 'GET', url: 'https://example.com' })";

describe('workflow ctx.http result flags', () => {
	it.each([
		['reads the status only', `const r = await ${call}; return { s: r.status };`, true, true],
		['reads a member at once', `return { s: (await ${call}).status };`, true, true],
		['destructures the status', `const { status } = await ${call}; return { status };`, true, true],
		[
			'reads status and body',
			`const r = await ${call}; return { s: r.status, b: r.body };`,
			true,
			false,
		],
		[
			'reads status and headers',
			`const r = await ${call}; return { s: r.status, h: r.headers };`,
			false,
			true,
		],
		['destructures the body', `const { body } = await ${call}; return { body };`, true, false],
		['returns the response', `const r = await ${call}; return r;`, false, false],
		['uses a let binding', `let r = await ${call}; return { s: r.status };`, false, false],
		[
			'destructures a rest',
			`const { status, ...rest } = await ${call}; return { status, rest };`,
			false,
			false,
		],
		['uses an element access', `const r = await ${call}; return { s: r['status'] };`, false, false],
		[
			'passes the response on',
			`const r = await ${call}; return JSON.parse(JSON.stringify(r)) as unknown;`,
			false,
			false,
		],
	])('when the workflow %s', (_name, use, headers, body) => {
		expect(workflowFlags(use)).toEqual({ headers, body });
	});
});
