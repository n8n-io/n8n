import { describe, expect, it } from 'vitest';

import {
	buildAutoApprovePayload,
	countEvents,
	getPendingAgentIds,
	extractConfirmationRequestId,
} from '../../evaluations/harness/chat-loop';
import { createPrunedEventSink } from '../event-log';

function feed(sink: ReturnType<typeof createPrunedEventSink>, payloads: object[]): void {
	for (const payload of payloads) {
		sink.handler({ data: JSON.stringify(payload) });
	}
}

describe('createPrunedEventSink', () => {
	it('drops ephemeral events but still counts them', () => {
		const sink = createPrunedEventSink();
		feed(sink, [
			{ type: 'text-delta', payload: { text: 'hello' } },
			{ type: 'reasoning-delta', payload: { text: 'thinking' } },
			{ type: 'status', payload: { status: 'working' } },
			{ type: 'filesystem-request', payload: {} },
			{ type: 'run-start', runId: 'r1' },
		]);

		expect(sink.events).toHaveLength(1);
		expect(sink.stats.received).toBe(5);
		expect(sink.stats.droppedEphemeral).toBe(4);
		// Counters stay faithful to the wire even though the array does not.
		expect(sink.stats.countsByType['text-delta']).toBe(1);
	});

	it('preserves the counters chat-loop drives the conversation with', () => {
		const sink = createPrunedEventSink();
		feed(sink, [
			{ type: 'run-start', runId: 'r1' },
			{ type: 'text-delta', payload: { text: 'x' } },
			{ type: 'run-finish', runId: 'r1', payload: { status: 'success' } },
			{ type: 'run-start', runId: 'r2' },
			{ type: 'run-finish', runId: 'r2', payload: { status: 'success' } },
		]);

		expect(countEvents(sink.events, 'run-start')).toBe(2);
		expect(countEvents(sink.events, 'run-finish')).toBe(2);
	});

	it('keeps agentId reachable so getPendingAgentIds still works', () => {
		const sink = createPrunedEventSink();
		feed(sink, [
			// agentId at the top level...
			{ type: 'agent-spawned', agentId: 'a1' },
			// ...and nested under payload: extractAgentId accepts either.
			{ type: 'agent-spawned', payload: { agentId: 'a2' } },
			{ type: 'agent-completed', agentId: 'a1' },
		]);

		expect(getPendingAgentIds(sink.events)).toEqual(['a2']);
	});

	it('truncates a huge text-block down to a bounded projection', () => {
		const sink = createPrunedEventSink();
		const huge = 'x'.repeat(100_000);
		feed(sink, [{ type: 'text-block', runId: 'r1', payload: { content: huge, message: huge } }]);

		const retained = JSON.stringify(sink.events[0]);
		expect(retained.length).toBeLessThan(1_000);
		// `content` isn't on the keep-list at all; `message` is, but truncated.
		expect(retained).not.toContain('x'.repeat(1_000));
		expect(sink.stats.approxSseBytes).toBeGreaterThan(100_000);
	});

	it('records unparseable frames without throwing', () => {
		const sink = createPrunedEventSink();
		sink.handler({ data: 'not json' });
		sink.handler({ data: '"a bare string"' });
		expect(sink.events).toHaveLength(0);
		expect(sink.stats.parseFailures).toBe(2);
	});

	it('types an event with no `type` field as "unknown" rather than dropping it', () => {
		const sink = createPrunedEventSink();
		feed(sink, [{ runId: 'r1' }]);
		expect(sink.events[0].type).toBe('unknown');
	});

	describe('overflow cap', () => {
		it('drops non-essential events but keeps essentials', () => {
			const sink = createPrunedEventSink(3);
			feed(sink, [
				{ type: 'tool-call', payload: {} },
				{ type: 'tool-call', payload: {} },
				{ type: 'tool-call', payload: {} },
				{ type: 'tool-call', payload: {} },
				{ type: 'run-finish', runId: 'r1', payload: { status: 'success' } },
			]);

			expect(sink.stats.droppedOverflow).toBe(1);
			expect(countEvents(sink.events, 'run-finish')).toBe(1);
			expect(sink.stats.capExceededByEssentials).toBe(true);
		});

		it('leaves the flag clear when the cap is never reached', () => {
			const sink = createPrunedEventSink(100);
			feed(sink, [{ type: 'run-start', runId: 'r1' }]);
			expect(sink.stats.capExceededByEssentials).toBe(false);
			expect(sink.stats.droppedOverflow).toBe(0);
		});
	});

	// The load driver is useless if auto-approval breaks, because every build
	// prompt eventually hits a gate. So exercise the real production helper
	// against every payload variant it dispatches on.
	describe('confirmation-request survives verbatim', () => {
		const cases = [
			{
				name: 'domain access',
				payload: { requestId: 'c1', domainAccess: { domain: 'httpbin.org' } },
				expected: { kind: 'domainAccessApprove', domainAccessAction: 'allow_all' },
			},
			{
				name: 'web search',
				payload: { requestId: 'c2', webSearch: { query: 'n8n docs' } },
				expected: { kind: 'domainAccessApprove', domainAccessAction: 'allow_all' },
			},
			{
				name: 'resource decision',
				payload: {
					requestId: 'c3',
					resourceDecision: { options: ['denyOnce', 'allowOnce'] },
				},
				expected: { kind: 'resourceDecision', resourceDecision: 'allowOnce' },
			},
			{
				name: 'credential request',
				payload: { requestId: 'c4', credentialRequests: [{ type: 'httpBasicAuth' }] },
				expected: { kind: 'credentialSelection', credentials: {} },
			},
			{
				name: 'setup wizard',
				payload: { requestId: 'c5', setupRequests: [{ nodeName: 'HTTP Request' }] },
				expected: { kind: 'setupWorkflowApply' },
			},
			{
				name: 'ask-user questions',
				payload: { requestId: 'c6', inputType: 'questions' },
				expected: { kind: 'questions', answers: [] },
			},
			{
				name: 'plain approval',
				payload: { requestId: 'c7' },
				expected: { kind: 'approval', approved: true },
			},
		];

		it.each(cases)('$name round-trips through buildAutoApprovePayload', ({ payload, expected }) => {
			const sink = createPrunedEventSink();
			feed(sink, [{ type: 'confirmation-request', runId: 'r1', payload }]);

			const event = sink.events[0];
			expect(extractConfirmationRequestId(event)).toBe(payload.requestId);
			expect(buildAutoApprovePayload(event)).toEqual(expected);
		});

		it('keeps nested payload structure that a projection would have flattened', () => {
			const sink = createPrunedEventSink();
			feed(sink, [
				{
					type: 'confirmation-request',
					payload: {
						requestId: 'c8',
						resourceDecision: { options: ['denyOnce', 'allowForSession'] },
					},
				},
			]);

			// Proves the nested `options` array survived: the picked option depends
			// on reading it, and a flattened payload would fall back to allowOnce.
			expect(buildAutoApprovePayload(sink.events[0])).toEqual({
				kind: 'resourceDecision',
				resourceDecision: 'allowForSession',
			});
		});

		it('does not retain a giant blob riding along on a confirmation payload', () => {
			// Kept verbatim is a deliberate trade-off; assert the blast radius is
			// one event, not a per-turn multiplier.
			const sink = createPrunedEventSink();
			feed(sink, [
				{
					type: 'confirmation-request',
					payload: { requestId: 'c9', description: 'y'.repeat(50_000) },
				},
				{ type: 'text-block', payload: { message: 'y'.repeat(50_000) } },
			]);

			expect(JSON.stringify(sink.events[0]).length).toBeGreaterThan(50_000);
			expect(JSON.stringify(sink.events[1]).length).toBeLessThan(1_000);
		});
	});
});
