import {
	joinLabel,
	matchTool,
	missingCapabilities,
	sessionOutcomes,
	splitLabel,
	toLabel,
	type InsightCall,
} from '../mcp-server-insights';

let clock = 0;
const call = (sessionId: string, overrides: Partial<InsightCall> = {}): InsightCall => ({
	kind: 'tool',
	name: 'get_order_status',
	status: 'ok',
	intent: null,
	sessionId,
	clientName: 'claude-code',
	// Two minutes apart, so calls are not repeated calls unless a test sets the time.
	createdAt: new Date((clock += 120_000)),
	...overrides,
});
const missing = (sessionId: string, intent: string) =>
	call(sessionId, { kind: 'missing', name: 'get_more_tools', intent });

describe('matchTool', () => {
	it('should find a tool when the request has all the words of its name', () => {
		expect(
			matchTool('Cancel an order by its order id.', ['get_order_status', 'cancel_order']),
		).toBe('cancel_order');
		expect(matchTool('cancel orders', ['cancel_order'])).toBe('cancel_order');
	});

	it('should find no tool when a word of the name is absent', () => {
		expect(matchTool('cancel an order', ['get_order_status'])).toBeNull();
	});
});

describe('sessionOutcomes', () => {
	it('should use the last call of each session', () => {
		const calls = [
			call('a'),
			call('b'),
			missing('b', 'cancel an order'),
			call('c', { status: 'error' }),
		];
		expect(sessionOutcomes(calls)).toEqual({ completed: 1, failed: 1, deadEnd: 1 });
	});
});

describe('missingCapabilities', () => {
	const calls = [
		call('a'),
		missing('a', 'Cancel an order'),
		missing('a', 'cancel an order'),
		missing('b', 'refund a payment'),
		missing('c', 'refund a payment'),
	];

	it('should collect the evidence and put the request with most sessions first', () => {
		const [first, second] = missingCapabilities(calls, []);
		expect(first).toMatchObject({ name: 'refund a payment', count: 2, sessions: 2 });
		expect(second).toMatchObject({
			name: 'cancel an order',
			count: 2,
			sessions: 1,
			clients: ['claude-code'],
			precedingTools: ['get_order_status'],
			resolvedBy: null,
			lastSessionId: 'a',
		});
	});

	it('should mark a request as resolved when a tool can do it', () => {
		const result = missingCapabilities(calls, ['cancel_order']);
		expect(result.map((item) => item.resolvedBy)).toEqual([null, 'cancel_order']);
	});

	it('should make one row of requests that have the same label', () => {
		const labelled = [
			missing('a', 'cancel_order: Cancel an order by its order id.'),
			missing('b', 'cancel_order: Cancel an order and issue a refund'),
		];
		expect(missingCapabilities(labelled, ['cancel_order_and_refund'])).toMatchObject([
			{
				name: 'cancel_order',
				label: 'cancel_order',
				count: 2,
				sessions: 2,
				examples: ['Cancel an order by its order id.', 'Cancel an order and issue a refund'],
				resolvedBy: 'cancel_order_and_refund',
			},
		]);
	});
});

describe('labels', () => {
	it('should clean a label and keep it with the request', () => {
		expect(toLabel('Cancel Order!')).toBe('cancel_order');
		expect(toLabel(undefined)).toBeNull();
		expect(splitLabel(joinLabel('cancel_order', 'Cancel it: now') ?? '')).toEqual({
			label: 'cancel_order',
			request: 'Cancel it: now',
		});
		expect(splitLabel('cancel an order: now')).toEqual({
			label: null,
			request: 'cancel an order: now',
		});
	});
});
