import { generateToolChecks, runToolChecks } from '../tool-checks';
import type { AgentToolProfile, ChatTurn, TimelineEvent } from '../types';

const reads: AgentToolProfile = {
	name: 'list_orders',
	source: 'node',
	action: 'reads',
	basis: 'operation',
	requireApproval: false,
};
const actsWithApproval: AgentToolProfile = {
	name: 'refund_order',
	source: 'node',
	action: 'acts',
	basis: 'operation',
	requireApproval: true,
};

function toolCall(
	name: string,
	toolCallId: string,
	overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> = {},
): TimelineEvent {
	return {
		type: 'tool-call',
		kind: 'node',
		name,
		toolCallId,
		input: { orderId: '1' },
		output: { ok: true },
		startTime: 0,
		endTime: 1,
		success: true,
		...overrides,
	};
}

function turn(timeline: TimelineEvent[], reply = 'Done.'): ChatTurn {
	return { userMessage: 'Hi', reply, timeline };
}

function verdictFor(checkId: string, turns: ChatTurn[], profiles = [reads, actsWithApproval]) {
	const checks = generateToolChecks(profiles);
	return runToolChecks(checks, turns).find((v) => v.checkId === checkId);
}

describe('generateToolChecks', () => {
	it('makes no tool checks for an agent with no tools, only the reply check', () => {
		expect(generateToolChecks([]).map((c) => c.id)).toEqual(['tool:empty_reply']);
	});

	it('adds the approval check only when a tool asks for approval', () => {
		expect(generateToolChecks([reads]).map((c) => c.id)).not.toContain('tool:acted_after_no');
		expect(generateToolChecks([reads, actsWithApproval]).map((c) => c.id)).toContain(
			'tool:acted_after_no',
		);
	});

	it('gives every check a question and a reason', () => {
		for (const check of generateToolChecks([reads, actsWithApproval])) {
			expect(check.kind).toBe('tool');
			expect(check.question.length).toBeGreaterThan(0);
			expect(check.reason.length).toBeGreaterThan(0);
		}
	});
});

describe('runToolChecks', () => {
	it('is not_run when the chat has no recorded timeline', () => {
		expect(verdictFor('tool:tool_failed', [{ userMessage: 'Hi', reply: 'Hello' }])).toEqual(
			expect.objectContaining({ status: 'not_run' }),
		);
	});

	it('is not_applicable when no tool ran', () => {
		expect(verdictFor('tool:tool_failed', [turn([])])).toEqual(
			expect.objectContaining({ status: 'not_applicable' }),
		);
	});

	it('fails tool_failed and points at the failed call', () => {
		const verdict = verdictFor('tool:tool_failed', [
			turn([toolCall('list_orders', 'a')]),
			turn([toolCall('list_orders', 'b', { success: false, output: { error: 'timeout' } })]),
		]);

		expect(verdict).toEqual(
			expect.objectContaining({ status: 'fail', moment: { turnIndex: 1, toolCallId: 'b' } }),
		);
	});

	it('does not count a call that waits for approval as a failure', () => {
		const verdict = verdictFor('tool:tool_failed', [
			turn([
				toolCall('refund_order', 'r1', { success: false, endTime: 0, output: undefined }),
				{ type: 'suspension', toolName: 'refund_order', toolCallId: 'r1', timestamp: 1 },
			]),
		]);

		expect(verdict).toEqual(expect.objectContaining({ status: 'pass' }));
	});

	it('does not count a declined call as a failure', () => {
		const verdict = verdictFor('tool:tool_failed', [
			turn([
				toolCall('refund_order', 'r1', { output: { declined: true, message: 'Not approved' } }),
			]),
		]);

		expect(verdict).toEqual(expect.objectContaining({ status: 'pass' }));
	});

	it('fails tool_failed on a workflow tool that ran but returned an error', () => {
		const verdict = verdictFor('tool:tool_failed', [
			turn([
				toolCall('list_orders', 'w1', {
					kind: 'workflow',
					output: { executionId: '11', status: 'error', error: 'Service Unavailable' },
				}),
			]),
		]);

		expect(verdict).toEqual(
			expect.objectContaining({ status: 'fail', moment: { turnIndex: 0, toolCallId: 'w1' } }),
		);
		expect(verdict?.reason).toContain('Service Unavailable');
	});

	it('passes tool_failed when every call succeeded', () => {
		expect(verdictFor('tool:tool_failed', [turn([toolCall('list_orders', 'a')])])).toEqual(
			expect.objectContaining({ status: 'pass' }),
		);
	});

	it('fails repeated_call on three identical calls in a row', () => {
		const verdict = verdictFor('tool:repeated_call', [
			turn([
				toolCall('list_orders', 'a'),
				toolCall('list_orders', 'b'),
				toolCall('list_orders', 'c'),
			]),
		]);

		expect(verdict).toEqual(
			expect.objectContaining({ status: 'fail', moment: { turnIndex: 0, toolCallId: 'c' } }),
		);
	});

	it('passes repeated_call when the inputs differ', () => {
		const verdict = verdictFor('tool:repeated_call', [
			turn([
				toolCall('list_orders', 'a', { input: { orderId: '1' } }),
				toolCall('list_orders', 'b', { input: { orderId: '2' } }),
				toolCall('list_orders', 'c', { input: { orderId: '3' } }),
			]),
		]);

		expect(verdict).toEqual(expect.objectContaining({ status: 'pass' }));
	});

	it('fails acted_after_no when the agent asks again for an action the user refused', () => {
		const verdict = verdictFor('tool:acted_after_no', [
			turn([
				{ type: 'suspension', toolName: 'refund_order', toolCallId: 'r1', timestamp: 1 },
				{ type: 'hitl-response', toolCallId: 'r1', response: { approved: false }, timestamp: 2 },
				{ type: 'suspension', toolName: 'refund_order', toolCallId: 'r2', timestamp: 3 },
			]),
		]);

		expect(verdict).toEqual(
			expect.objectContaining({ status: 'fail', moment: { turnIndex: 0, toolCallId: 'r2' } }),
		);
	});

	it('is not_applicable for acted_after_no when the user never refused', () => {
		const verdict = verdictFor('tool:acted_after_no', [
			turn([
				{ type: 'suspension', toolName: 'refund_order', toolCallId: 'r1', timestamp: 1 },
				{ type: 'hitl-response', toolCallId: 'r1', response: { approved: true }, timestamp: 2 },
			]),
		]);

		expect(verdict).toEqual(expect.objectContaining({ status: 'not_applicable' }));
	});

	it('fails hit_limit on a guardrail event', () => {
		const verdict = verdictFor('tool:hit_limit', [
			turn([{ type: 'guardrail', code: 'budget_exceeded', timestamp: 1 }]),
		]);

		expect(verdict).toEqual(expect.objectContaining({ status: 'fail' }));
		expect(verdict?.reason).toContain('budget_exceeded');
	});

	it('fails empty_reply when a turn ends with no text, even without a timeline', () => {
		const verdict = verdictFor('tool:empty_reply', [
			{ userMessage: 'Hi', reply: 'Hello' },
			{ userMessage: 'And?', reply: '   ' },
		]);

		expect(verdict).toEqual(expect.objectContaining({ status: 'fail', moment: { turnIndex: 1 } }));
	});

	it('says when the empty reply came from a failed run', () => {
		const verdict = verdictFor('tool:empty_reply', [
			{ userMessage: 'Hi', reply: '', runFailed: true },
		]);

		expect(verdict?.reason).toBe('The run failed and the person got no reply.');
	});
});
