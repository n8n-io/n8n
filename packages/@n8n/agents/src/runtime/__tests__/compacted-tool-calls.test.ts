import type { AgentDbMessage, ContentToolCall } from '../../types/sdk/message';
import {
	collectCompactedToolCalls,
	historyToolCallRef,
	renderCompactedToolCalls,
} from '../memory/compacted-tool-calls';

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
	const next = collectCompactedToolCalls(
		[message(Array.from({ length: 50 }, (_, i) => call(`call-${i}`)))],
		earlier,
	);
	const text = renderCompactedToolCalls(next)!;
	expect(text).toContain(`inspect ${historyToolCallRef('m1', 49)} returned`);
	expect(text).not.toContain(historyToolCallRef('earlier', 0));
	expect(text).not.toContain('Private result');
	expect(text.length).toBeLessThanOrEqual(1_024);
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
