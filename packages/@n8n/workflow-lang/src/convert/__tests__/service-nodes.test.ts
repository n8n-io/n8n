/**
 * Core nodes that call a service of n8n (spec 9.9): Remove Duplicates across executions,
 * Execution Data and Time Saved. The forms that are not exact stay in the fallback host.
 */
import { compile } from '../../compiler/index.ts';
import { convertWorkflow } from '../index.ts';

function workflow(node: Record<string, unknown>, extra: Array<Record<string, unknown>> = []) {
	return {
		name: 'Services',
		nodes: [
			{
				id: 'hook',
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{ id: 'node', name: 'Node', position: [200, 0], ...node },
			...extra,
		],
		connections: { Hook: { main: [[{ node: 'Node', type: 'main', index: 0 }]] } },
	};
}

const data = {
	type: 'n8n-nodes-base.executionData',
	typeVersion: 1.1,
	parameters: { dataToSave: { values: [{ key: 'id', value: '={{ $json.body.id }}' }] } },
};
const saved = {
	type: 'n8n-nodes-base.timeSaved',
	typeVersion: 1,
	parameters: { mode: 'perItem', minutesSaved: 4 },
};
const seen = {
	type: 'n8n-nodes-base.removeDuplicates',
	typeVersion: 2,
	parameters: {
		operation: 'removeItemsSeenInPreviousExecutions',
		logic: 'removeItemsWithAlreadySeenKeyValues',
		dedupeValue: '={{ $json.body.id }}',
		options: {},
	},
};

/** The fallback host runs a node as a `ctx.node` step with the type of the v1 node. */
const HOST_CALL = 'await ctx.node(';

const inHost = (node: Record<string, unknown>, options = {}, extra = []) => {
	const out = convertWorkflow(workflow(node, extra), options);
	expect(out.ok).toBe(true);
	expect(compile(out.source).diagnostics).toEqual([]);
	return out.source.includes(HOST_CALL);
};

describe('core nodes that call a service of n8n', () => {
	it('converts the three nodes to service calls', () => {
		for (const node of [data, saved, seen]) expect(inHost(node)).toBe(false);
		const source = convertWorkflow(workflow(data)).source;
		expect(source).toContain("service: 'execution', op: 'setCustomData'");
		expect(convertWorkflow(workflow(saved)).source).toContain(
			"op: 'setTimeSaved', args: { minutes: hook.length * 4 }",
		);
	});

	it('runs the nodes in the host for a runtime without service calls', () => {
		for (const node of [data, saved, seen]) expect(inHost(node, { services: false })).toBe(true);
	});

	it('runs Execution Data and Remove Duplicates in the host under a continue setting', () => {
		for (const node of [data, seen]) {
			expect(inHost({ ...node, onError: 'continueRegularOutput' })).toBe(true);
			expect(inHost({ ...node, retryOnFail: true })).toBe(true);
		}
	});

	it('runs Time Saved in the host when the minutes are not a fixed number', () => {
		const parameters = { minutesSaved: '={{ $json.body.minutes }}' };
		expect(inHost({ ...saved, parameters })).toBe(true);
		expect(inHost({ ...saved, parameters: { minutesSaved: -1 } })).toBe(true);
	});

	it('gives the items on for an Execution Data operation that saves nothing', () => {
		const source = convertWorkflow(workflow({ ...data, parameters: { operation: 'get' } })).source;
		expect(source).not.toContain('ctx.service');
		expect(source).not.toContain(HOST_CALL);
	});

	it('runs Remove Duplicates in the host for a date key and for a scope that is not fixed', () => {
		const date = { ...seen.parameters, logic: 'removeItemsUpToStoredDate' };
		expect(inHost({ ...seen, parameters: date })).toBe(true);
		const scope = { ...seen.parameters, options: { scope: '={{ $json.body.scope }}' } };
		expect(inHost({ ...seen, parameters: scope })).toBe(true);
	});

	it('runs Remove Duplicates in the host when a node has the name of its helper step', () => {
		const other = {
			id: 'other',
			name: 'Node (history size)',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [400, 0],
			parameters: {},
		};
		const out = convertWorkflow(workflow(seen, [other]));
		expect(out.source).toContain(HOST_CALL);
	});
});
