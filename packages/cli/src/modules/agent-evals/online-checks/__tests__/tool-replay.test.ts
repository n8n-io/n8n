import { isHeldOutput } from '@/modules/agents/json-config/test-sandbox';

import { ToolReplay, readPinnedToolCalls } from '../tool-replay';
import type { PinnedToolCall } from '../saved-test-case';

const saved: PinnedToolCall[] = [
	{ tool: 'lookup_order', input: { orderId: '1042' }, output: { status: 'in transit' } },
	{ tool: 'lookup_order', input: { orderId: '7' }, output: { status: 'delivered' } },
	{ tool: 'send_email', input: { to: 'ana@example.com' }, output: { id: 'msg-1' } },
];

const acting = new Set(['send_email', 'refund_order']);
const own = new Set(['lookup_order', 'send_email', 'refund_order', 'search_faq']);

function replay() {
	return new ToolReplay(saved, { ownTools: own, actingTools: acting });
}

describe('ToolReplay', () => {
	it('answers a call with the same input from the saved call', () => {
		const r = replay();

		expect(r.answer('lookup_order', { orderId: '7' })).toEqual({ status: 'delivered' });
		expect(r.events).toEqual([{ tool: 'lookup_order', input: { orderId: '7' }, match: 'exact' }]);
		expect(r.offScript).toBe(false);
	});

	it('matches an input regardless of key order', () => {
		const r = new ToolReplay([{ tool: 'lookup_order', input: { a: 1, b: 2 }, output: 'x' }], {
			ownTools: own,
			actingTools: acting,
		});

		expect(r.answer('lookup_order', { b: 2, a: 1 })).toBe('x');
		expect(r.events[0].match).toBe('exact');
	});

	it('uses each saved call once, then the next unused call of that tool', () => {
		const r = replay();

		r.answer('lookup_order', { orderId: '1042' });
		const second = r.answer('lookup_order', { orderId: '1042' });

		expect(second).toEqual({ status: 'delivered' });
		expect(r.events[1].match).toBe('close');
	});

	it('holds an action that has no saved call left, and never marks the run off script', () => {
		const r = replay();

		const output = r.answer('refund_order', { orderId: '1042' });

		expect(isHeldOutput(output)).toBe(true);
		expect(r.events[0].match).toBe('held');
		expect(r.offScript).toBe(false);
	});

	it('marks the run off script when a read has no saved data', () => {
		const r = replay();

		const output = r.answer('search_faq', { q: 'returns' });

		expect(output).toEqual({ error: expect.stringContaining('no saved data') });
		expect(r.events[0].match).toBe('none');
		expect(r.offScript).toBe(true);
		expect(r.offScriptTools).toEqual(['search_faq']);
	});

	it('replays only the agent own tools', () => {
		const r = replay();

		expect(r.replays('lookup_order')).toBe(true);
		expect(r.replays('web_search')).toBe(false);
	});
});

describe('readPinnedToolCalls', () => {
	it('reads the saved JSON column', () => {
		expect(readPinnedToolCalls(JSON.stringify(saved))).toEqual(saved);
	});

	it('returns null when the case has no saved tool data', () => {
		expect(readPinnedToolCalls(null)).toBeNull();
		expect(readPinnedToolCalls('')).toBeNull();
		expect(readPinnedToolCalls('not json')).toBeNull();
		expect(readPinnedToolCalls('{"tool":"x"}')).toBeNull();
	});

	it('keeps an empty list: the saved run called no tools', () => {
		expect(readPinnedToolCalls('[]')).toEqual([]);
	});

	it('drops entries without a tool name', () => {
		expect(readPinnedToolCalls('[{"input":1},{"tool":"a","input":1,"output":2}]')).toEqual([
			{ tool: 'a', input: 1, output: 2 },
		]);
	});
});
