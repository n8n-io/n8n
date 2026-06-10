// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { describe, expect, it } from 'vitest';

import { createChatThreadState, type ChatMessage } from './chat-thread';
import type { InstanceAiEvent, InstanceAiMessage } from '../../shared/types';

function snapshotMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'm1',
		role: 'assistant',
		createdAt: '2026-06-10T00:00:00.000Z',
		content: 'hello',
		reasoning: '',
		isStreaming: false,
		...overrides,
	};
}

const runStart = (runId: string, agentId: string, messageGroupId?: string) =>
	({
		type: 'run-start',
		runId,
		agentId,
		payload: { messageId: 'um1', messageGroupId },
	}) as InstanceAiEvent;

const textDelta = (runId: string, agentId: string, text: string) =>
	({ type: 'text-delta', runId, agentId, payload: { text } }) as InstanceAiEvent;

const runFinish = (runId: string) =>
	({
		type: 'run-finish',
		runId,
		agentId: 'root',
		payload: { status: 'completed' },
	}) as InstanceAiEvent;

function makeState(snapshot: InstanceAiMessage[] = []) {
	const messages: ChatMessage[] = [];
	const state = createChatThreadState(messages, snapshot);
	return { messages, state };
}

describe('createChatThreadState', () => {
	it('maps snapshot messages to the transcript', () => {
		const { messages } = makeState([
			snapshotMessage({ id: 'u1', role: 'user', content: 'hi' }),
			snapshotMessage({ id: 'a1', role: 'assistant', content: 'hello', isStreaming: true }),
		]);

		expect(messages).toEqual([
			{ id: 'u1', role: 'user', content: 'hi', isStreaming: false },
			{ id: 'a1', role: 'assistant', content: 'hello', isStreaming: true },
		]);
	});

	it('appends an optimistic user message', () => {
		const { messages, state } = makeState();

		state.addUserMessage('hi there');

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ role: 'user', content: 'hi there', isStreaming: false });
	});

	it('opens a streaming assistant message on run-start and appends root-agent deltas', () => {
		const { messages, state } = makeState();

		state.apply(runStart('r1', 'root'));
		state.apply(textDelta('r1', 'root', 'Hel'));
		state.apply(textDelta('r1', 'root', 'lo'));

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ role: 'assistant', content: 'Hello', isStreaming: true });
	});

	it('ignores sub-agent deltas — only the root agent streams into the bubble', () => {
		const { messages, state } = makeState();

		state.apply(runStart('r1', 'root'));
		state.apply(textDelta('r1', 'sub-agent', 'noise'));

		expect(messages[0].content).toBe('');
	});

	it('ignores deltas for unknown runs', () => {
		const { messages, state } = makeState();

		state.apply(textDelta('r-unknown', 'root', 'noise'));

		expect(messages).toHaveLength(0);
	});

	it('ends the streaming state on run-finish', () => {
		const { messages, state } = makeState();

		state.apply(runStart('r1', 'root'));
		state.apply(runFinish('r1'));

		expect(messages[0].isStreaming).toBe(false);
	});

	it('reuses the bubble for a follow-up run of the same message group', () => {
		const { messages, state } = makeState();

		state.apply(runStart('r1', 'root', 'g1'));
		state.apply(textDelta('r1', 'root', 'first'));
		state.apply(runFinish('r1'));
		state.apply(runStart('r2', 'root-2', 'g1'));
		state.apply(textDelta('r2', 'root-2', ' second'));

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ content: 'first second', isStreaming: true });
	});

	it('resumes streaming into a snapshot message that was mid-run', () => {
		const snapshot = snapshotMessage({
			id: 'a1',
			content: 'partial',
			isStreaming: true,
			runIds: ['r1'],
			messageGroupId: 'g1',
			agentTree: { agentId: 'root' } as InstanceAiMessage['agentTree'],
		});
		const { messages, state } = makeState([snapshot]);

		state.apply(textDelta('r1', 'root', ' more'));
		state.apply(runFinish('r1'));

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ content: 'partial more', isStreaming: false });
	});
});
