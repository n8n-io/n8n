import { compile } from '../compiler/index.ts';
import type { CanvasEdit, EditResult } from '../edit/index.ts';
import { applyCanvasEdit } from '../edit/index.ts';
import { corpusCase } from './helpers.ts';

const order = corpusCase('01-order-approval').source;
/** A dollar sign, so that test strings can hold template syntax. */
const D = '$';

function ok(source: string, edit: CanvasEdit): { source: string; variable?: string } {
	const result: EditResult = applyCanvasEdit(source, edit);
	if ('error' in result) throw new Error(`edit failed: ${result.error}`);
	// Everything outside the replaced range is byte-identical.
	const { start, end, text } = result.edit;
	expect(result.source.slice(0, start)).toBe(source.slice(0, start));
	expect(result.source.slice(start + text.length)).toBe(source.slice(end));
	expect(compile(result.source).ok).toBe(true);
	return result;
}

function fails(source: string, edit: CanvasEdit) {
	const result = applyCanvasEdit(source, edit);
	if (!('error' in result)) throw new Error('edit did not fail');
	return result;
}

const stepIds = (source: string) => compile(source).manifest?.steps.map((s) => s.id) ?? [];

describe('canvas write-back on the order workflow', () => {
	it('edits a literal parameter', () => {
		const r = ok(order, {
			kind: 'setParameter',
			nodeId: 'Charge',
			path: ['url'],
			value: { value: 'https://payments.example.com/v2/charges' },
		});
		expect(r.source).toContain("url: 'https://payments.example.com/v2/charges',");
	});

	it('edits a nested parameter with an expression', () => {
		const r = ok(order, {
			kind: 'setParameter',
			nodeId: 'Charge',
			path: ['body', 'amount'],
			value: { expression: 'Math.round(total * 100) + 50' },
		});
		expect(r.source).toContain('amount: Math.round(total * 100) + 50 }');
	});

	it('adds a missing parameter in the style of the object', () => {
		const r = ok(order, {
			kind: 'setParameter',
			nodeId: 'Charge',
			path: ['headers'],
			value: { value: { 'idempotency-key': 'k1' } },
		});
		expect(r.source).toContain(
			"credential: 'payments',\n\t\t\t\theaders: { 'idempotency-key': 'k1' },",
		);
	});

	it('rejects a parameter edit that does not compile', () => {
		const r = fails(order, {
			kind: 'setParameter',
			nodeId: 'Charge',
			path: ['url'],
			value: { expression: 'missing.value' },
		});
		expect(r.error).toContain('missing');
		expect(r.diagnostics?.[0].nodeId).toBe('Charge');
	});

	it('maps data into a new field', () => {
		const r = ok(order, {
			kind: 'mapData',
			nodeId: 'Confirm',
			path: ['body', 'email'],
			expression: 'order.customer.email',
		});
		expect(r.source).toContain('chargeId: charge.body.id, email: order.customer.email }');
	});

	it('maps data at the end of a template field', () => {
		const r = ok(order, {
			kind: 'mapData',
			nodeId: 'Approve short order',
			path: ['message'],
			expression: 'order.customer.email',
			mode: 'append',
		});
		expect(r.source).toContain(`short.join(', ')}${D}{order.customer.email}\``);
	});

	it('maps data at the end of a plain string field', () => {
		const r = ok(order, {
			kind: 'mapData',
			nodeId: 'Charge',
			path: ['url'],
			expression: 'order.orderId',
			mode: 'append',
		});
		expect(r.source).toContain(`url: \`https://payments.example.com/charges${D}{order.orderId}\``);
	});

	it('renames a node', () => {
		const r = ok(order, { kind: 'rename', nodeId: 'Charge', newName: 'Charge card' });
		expect(stepIds(r.source)).toContain('Charge card');
		expect(stepIds(r.source)).not.toContain('Charge');
	});

	it('keeps the step id when executions are parked on the node', () => {
		const r = ok(order, {
			kind: 'rename',
			nodeId: 'Charge',
			newName: 'Charge card',
			parkedStepIds: ['Charge'],
		});
		expect(r.source).toContain("name: 'Charge card', id: 'Charge',");
		const steps = compile(r.source).manifest?.steps ?? [];
		expect(steps.find((s) => s.id === 'Charge')?.name).toBe('Charge card');
	});

	it('rejects a rename to a name that exists', () => {
		const r = fails(order, { kind: 'rename', nodeId: 'Charge', newName: 'Confirm' });
		expect(r.error).toContain('WL031');
	});

	it('adds a node after another, with a fresh variable', () => {
		const r = ok(order, {
			kind: 'addAfter',
			afterNodeId: 'Charge',
			node: {
				name: 'Notify Slack',
				type: 'n8n-nodes-base.slack',
				parameters: { channel: '#orders', text: 'charged' },
				credential: 'slack',
			},
		});
		expect(r.variable).toBe('notifySlack');
		expect(r.source).toContain(
			"\n\t\t\tconst notifySlack = await ctx.node({ name: 'Notify Slack', type: 'n8n-nodes-base.slack', parameters: { channel: '#orders', text: 'charged' }, credential: 'slack' });\n",
		);
		expect(stepIds(r.source)).toEqual([
			'Check stock',
			'Approve short order',
			'Reject',
			'Charge',
			'Notify Slack',
			'Confirm',
			'Payment failed',
		]);
	});

	it('picks another variable name when the name is taken', () => {
		const r = ok(order, {
			kind: 'addAfter',
			afterNodeId: 'Charge',
			node: { name: 'order', type: 'n8n-nodes-base.noOp' },
		});
		expect(r.variable).toBe('order2');
	});

	it('deletes a node', () => {
		const r = ok(order, { kind: 'delete', nodeId: 'Confirm' });
		expect(stepIds(r.source)).not.toContain('Confirm');
		expect(r.source).not.toContain("name: 'Confirm'");
	});

	it('reports the nodes that use the variable of a deleted node', () => {
		const r = fails(order, { kind: 'delete', nodeId: 'Charge' });
		expect(r.error).toContain('charge');
		const nodes = new Set(r.diagnostics?.map((d) => d.nodeId));
		expect(nodes).toContain('Confirm');
	});

	it('rejects a delete of a node inside a larger statement', () => {
		const src = corpusCase('07-promise-all-list').source;
		expect(fails(src, { kind: 'delete', nodeId: 'Profile' }).error).toContain('larger statement');
	});

	it('rejects a move that reads a variable before it is set', () => {
		const r = fails(order, { kind: 'move', nodeId: 'Confirm', before: 'Charge' });
		expect(r.error).toBe('The move would read `charge` before it is set.');
	});

	it('rejects a move out of the block', () => {
		expect(fails(order, { kind: 'move', nodeId: 'Reject', after: 'Charge' }).error).toContain(
			'within its block',
		);
	});

	it('rejects an unknown node', () => {
		expect(fails(order, { kind: 'delete', nodeId: 'Nope' }).error).toBe('No node with id "Nope".');
	});
});

describe('moving nodes', () => {
	const waits = corpusCase('17-approval-wait-respond').source;

	it('moves a node before another', () => {
		const r = ok(waits, { kind: 'move', nodeId: 'Past date', before: 'Until payday' });
		expect(stepIds(r.source).slice(-2)).toEqual(['Past date', 'Until payday']);
	});

	it('moves a node after another', () => {
		const r = ok(waits, { kind: 'move', nodeId: 'Until payday', after: 'Past date' });
		expect(stepIds(r.source).slice(-2)).toEqual(['Past date', 'Until payday']);
	});

	it('rejects a move past a statement that reads a value it sets', () => {
		const src = corpusCase('02-loops').source;
		const r = applyCanvasEdit(src, { kind: 'move', nodeId: 'Back off', before: 'Poll job' });
		expect('error' in r).toBe(true);
	});
});
