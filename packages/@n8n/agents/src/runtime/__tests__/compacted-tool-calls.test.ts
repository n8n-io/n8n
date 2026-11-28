import type { AgentDbMessage, ContentToolCall } from '../../types/sdk/message';
import {
	collectCompactedToolCalls,
	historyToolCallRef,
	renderCompactedToolCalls,
} from '../memory/compacted-tool-calls';
import { AgentMessageList } from '../model/message-list';

const OMISSION_NOTICE =
	'Older compacted calls were omitted. Use read_history text search before repeating a check.';

function call(id: string): ContentToolCall {
	return {
		type: 'tool-call',
		toolCallId: id,
		toolName: 'inspect',
		state: 'resolved',
		input: { file: 'example' },
		output: 'Private result',
	};
}

function message(content: ContentToolCall[]): AgentDbMessage {
	return { id: 'm1', role: 'assistant', createdAt: new Date('2026-01-01T00:00:00Z'), content };
}

it('keeps a bounded index of recent calls across successive masks', () => {
	const earlier = collectCompactedToolCalls([{ ...message([call('first')]), id: 'earlier' }]);
	const carried = collectCompactedToolCalls([message([call('second')])], earlier);
	const complete = renderCompactedToolCalls(carried);
	expect(complete).toContain(`inspect ${historyToolCallRef('earlier', 0)} returned`);
	expect(complete).not.toContain(OMISSION_NOTICE);

	const next = collectCompactedToolCalls(
		[message(Array.from({ length: 50 }, (_, i) => call(`call-${i}`)))],
		earlier,
	);
	const text = renderCompactedToolCalls(next)!;
	expect(text).toContain(`inspect ${historyToolCallRef('m1', 49)} returned`);
	expect(text).not.toContain(historyToolCallRef('earlier', 0));
	expect(text).not.toContain('Private result');
	expect(text).toContain(OMISSION_NOTICE);
	expect(text.length).toBeLessThanOrEqual(1_024);
});

it('uses the full budget when the index fits without a notice', () => {
	const earlier = collectCompactedToolCalls([
		message(Array.from({ length: 9 }, (_, i) => call(`call-${i}`))),
	]);
	const complete = renderCompactedToolCalls(earlier)!;
	expect(earlier).toHaveLength(9);
	expect(complete).toContain(historyToolCallRef('m1', 0));
	expect(complete).not.toContain(OMISSION_NOTICE);
	expect(complete.length).toBeLessThanOrEqual(1_024);

	const newer = { ...message([call('newer')]), id: 'm2' };
	const truncated = renderCompactedToolCalls(collectCompactedToolCalls([newer], earlier))!;
	expect(truncated).toContain(historyToolCallRef('m2', 0));
	expect(truncated).not.toContain(historyToolCallRef('m1', 0));
	expect(truncated).toContain(OMISSION_NOTICE);
	expect(truncated.length).toBeLessThanOrEqual(1_024);
});

it('keeps the omission notice after restoring the index from a checkpoint', () => {
	const list = new AgentMessageList();
	list.earlierCompactedToolCalls = collectCompactedToolCalls([
		message(Array.from({ length: 50 }, (_, i) => call(`call-${i}`))),
	]);
	const checkpoint = JSON.stringify(list.serialize());
	const restored = AgentMessageList.deserialize(JSON.parse(checkpoint));
	const carried = collectCompactedToolCalls([], restored.earlierCompactedToolCalls);
	expect(renderCompactedToolCalls(carried)).toBe(
		renderCompactedToolCalls(list.earlierCompactedToolCalls),
	);
	expect(renderCompactedToolCalls(carried)).toContain(OMISSION_NOTICE);
});

it('includes canceled gateway calls and hides their raw IDs', () => {
	const id = 'call_123__thought__AY89a1+JiipVUqj7/74Q==';
	const lines = collectCompactedToolCalls([
		message([
			{ ...call(id), state: 'resolved', output: null, canceled: true },
			{ ...call('pending'), state: 'pending' },
		]),
	]);
	expect(lines).toEqual([
		`inspect ${historyToolCallRef('m1', 0)} canceled 2026-01-01T00:00:00.000Z`,
	]);
	expect(lines[0]).not.toContain(id);
});
