import { ref } from 'vue';
import { describe, test, expect, vi } from 'vitest';
import { useResponseFeedback } from '../useResponseFeedback';
import type { InstanceAiMessage, InstanceAiAgentNode } from '@n8n/api-types';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-root',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function makeAssistantMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-assistant-1',
		role: 'assistant',
		createdAt: new Date().toISOString(),
		content: 'Hello',
		reasoning: '',
		isStreaming: false,
		agentTree: makeAgentNode(),
		...overrides,
	};
}

function makeUserMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-user-1',
		role: 'user',
		createdAt: new Date().toISOString(),
		content: 'Hi',
		reasoning: '',
		isStreaming: false,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

type PostFeedback = (
	threadId: string,
	responseId: string,
	payload: { rating: 'up' | 'down'; comment?: string },
) => Promise<void>;

function setup(
	initialMessages: InstanceAiMessage[] = [],
	options: { postFeedback?: PostFeedback } = {},
) {
	const messages = ref<InstanceAiMessage[]>(initialMessages);
	const currentThreadId = ref('thread-1');
	const mockTrack = vi.fn();
	const telemetry = { track: mockTrack };
	const postFeedback = options.postFeedback;
	const result = useResponseFeedback({ messages, currentThreadId, telemetry, postFeedback });
	return { messages, currentThreadId, mockTrack, postFeedback, ...result };
}

// ---------------------------------------------------------------------------
// rateableResponseId
// ---------------------------------------------------------------------------

describe('useResponseFeedback - rateableResponseId', () => {
	test('returns null when there are no messages', () => {
		const { rateableResponseId } = setup();
		expect(rateableResponseId.value).toBeNull();
	});

	test('returns responseId for the latest completed assistant turn', () => {
		const { rateableResponseId } = setup([makeUserMessage(), makeAssistantMessage({ id: 'a1' })]);
		expect(rateableResponseId.value).toBe('a1');
	});

	test('uses messageGroupId as responseId when present', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({ id: 'a1', messageGroupId: 'mg-1' }),
		]);
		expect(rateableResponseId.value).toBe('mg-1');
	});

	test('returns null when a user message exists after the latest assistant turn', () => {
		const { rateableResponseId } = setup([
			makeUserMessage({ id: 'u1' }),
			makeAssistantMessage({ id: 'a1' }),
			makeUserMessage({ id: 'u2' }),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('returns null while the response is streaming', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({ id: 'a1', isStreaming: true }),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('returns null while any agent in the tree is active', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				agentTree: makeAgentNode({
					status: 'completed',
					children: [makeAgentNode({ agentId: 'child-1', status: 'active' })],
				}),
			}),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('returns null while any tool call is still loading', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				agentTree: makeAgentNode({
					toolCalls: [{ toolCallId: 'tc-1', toolName: 'some-tool', args: {}, isLoading: true }],
				}),
			}),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('returns null while a confirmation is pending', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				agentTree: makeAgentNode({
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'run-workflow',
							args: {},
							isLoading: false,
							confirmation: { requestId: 'req-1', severity: 'info', message: 'Approve?' },
							confirmationStatus: 'pending',
						},
					],
				}),
			}),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('returns responseId for settled error responses', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				agentTree: makeAgentNode({ status: 'error', error: 'Something failed' }),
			}),
		]);
		expect(rateableResponseId.value).toBe('a1');
	});

	test('returns null for cancelled responses', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				agentTree: makeAgentNode({ status: 'cancelled' }),
			}),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('hidden while merged run group is still active', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				messageGroupId: 'mg-1',
				isStreaming: true,
				agentTree: makeAgentNode({ status: 'active' }),
			}),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('visible when merged run group settles', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				messageGroupId: 'mg-1',
				isStreaming: false,
				agentTree: makeAgentNode({ status: 'completed' }),
			}),
		]);
		expect(rateableResponseId.value).toBe('mg-1');
	});

	test('checks nested children recursively for loading tool calls', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				agentTree: makeAgentNode({
					children: [
						makeAgentNode({
							agentId: 'child-1',
							children: [
								makeAgentNode({
									agentId: 'grandchild-1',
									toolCalls: [
										{
											toolCallId: 'tc-deep',
											toolName: 'deep-tool',
											args: {},
											isLoading: true,
										},
									],
								}),
							],
						}),
					],
				}),
			}),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('checks nested children recursively for pending confirmations', () => {
		const { rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({
				id: 'a1',
				agentTree: makeAgentNode({
					children: [
						makeAgentNode({
							agentId: 'child-1',
							toolCalls: [
								{
									toolCallId: 'tc-1',
									toolName: 'some-tool',
									args: {},
									isLoading: false,
									confirmation: {
										requestId: 'r1',
										severity: 'warning',
										message: 'Sure?',
									},
									confirmationStatus: 'pending',
								},
							],
						}),
					],
				}),
			}),
		]);
		expect(rateableResponseId.value).toBeNull();
	});

	test('reactively updates when messages change', () => {
		const { messages, rateableResponseId } = setup([
			makeUserMessage(),
			makeAssistantMessage({ id: 'a1' }),
		]);
		expect(rateableResponseId.value).toBe('a1');

		// Add a user message — should become null
		messages.value.push(makeUserMessage({ id: 'u2' }));
		expect(rateableResponseId.value).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// submitFeedback
// ---------------------------------------------------------------------------

describe('useResponseFeedback - submitFeedback', () => {
	test('thumbs-up saves to feedbackByResponseId immediately', () => {
		const { submitFeedback, feedbackByResponseId } = setup();
		submitFeedback('resp-1', { rating: 'up' });
		expect(feedbackByResponseId.value['resp-1']).toEqual({ rating: 'up' });
	});

	test('thumbs-down emits telemetry but does NOT save to feedbackByResponseId', () => {
		const { submitFeedback, feedbackByResponseId, mockTrack } = setup();
		submitFeedback('resp-1', { rating: 'down' });
		expect(feedbackByResponseId.value['resp-1']).toBeUndefined();
		expect(mockTrack).toHaveBeenCalledWith(
			'User rated workflow generation',
			expect.objectContaining({ helpful: false }),
		);
	});

	test('text feedback after thumbs-down saves to feedbackByResponseId', () => {
		const { submitFeedback, feedbackByResponseId } = setup();
		submitFeedback('resp-1', { rating: 'down' });
		submitFeedback('resp-1', { feedback: 'Could be better' });
		expect(feedbackByResponseId.value['resp-1']).toEqual({ feedback: 'Could be better' });
	});

	test('thumbs-up emits rating telemetry with helpful: true', () => {
		const { submitFeedback, mockTrack } = setup();
		submitFeedback('resp-1', { rating: 'up' });
		expect(mockTrack).toHaveBeenCalledWith(
			'User rated workflow generation',
			expect.objectContaining({ response_id: 'resp-1', helpful: true }),
		);
	});

	test('text feedback emits text feedback telemetry', () => {
		const { submitFeedback, mockTrack } = setup();
		submitFeedback('resp-1', { feedback: 'Great job!' });
		expect(mockTrack).toHaveBeenCalledWith(
			'User submitted workflow generation feedback',
			expect.objectContaining({ response_id: 'resp-1', feedback: 'Great job!' }),
		);
	});

	test('includes thread_id in telemetry', () => {
		const { submitFeedback, mockTrack } = setup();
		submitFeedback('resp-1', { rating: 'up' });
		expect(mockTrack).toHaveBeenCalledWith(
			'User rated workflow generation',
			expect.objectContaining({ thread_id: 'thread-1' }),
		);
	});
});

// ---------------------------------------------------------------------------
// postFeedback (LangSmith annotation)
// ---------------------------------------------------------------------------

describe('useResponseFeedback - postFeedback', () => {
	test('thumbs-up posts rating to backend', () => {
		const postFeedback = vi.fn<PostFeedback>().mockResolvedValue(undefined);
		const { submitFeedback } = setup([], { postFeedback });
		submitFeedback('resp-1', { rating: 'up' });
		expect(postFeedback).toHaveBeenCalledWith('thread-1', 'resp-1', { rating: 'up' });
	});

	test('thumbs-down posts rating to backend', () => {
		const postFeedback = vi.fn<PostFeedback>().mockResolvedValue(undefined);
		const { submitFeedback } = setup([], { postFeedback });
		submitFeedback('resp-1', { rating: 'down' });
		expect(postFeedback).toHaveBeenCalledWith('thread-1', 'resp-1', { rating: 'down' });
	});

	test('text feedback merges the saved rating so comment upserts against rating', () => {
		const postFeedback = vi.fn<PostFeedback>().mockResolvedValue(undefined);
		const { submitFeedback } = setup([], { postFeedback });
		submitFeedback('resp-1', { rating: 'down' });
		submitFeedback('resp-1', { feedback: 'Too slow' });
		expect(postFeedback).toHaveBeenLastCalledWith('thread-1', 'resp-1', {
			rating: 'down',
			comment: 'Too slow',
		});
	});

	test('standalone text feedback without a prior rating is not posted', () => {
		const postFeedback = vi.fn<PostFeedback>().mockResolvedValue(undefined);
		const { submitFeedback } = setup([], { postFeedback });
		submitFeedback('resp-1', { feedback: 'Random comment' });
		expect(postFeedback).not.toHaveBeenCalled();
	});

	test('postFeedback rejection is swallowed and does not throw', () => {
		const postFeedback = vi.fn<PostFeedback>().mockRejectedValue(new Error('network down'));
		const { submitFeedback } = setup([], { postFeedback });
		expect(() => submitFeedback('resp-1', { rating: 'up' })).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// resetFeedback
// ---------------------------------------------------------------------------

describe('useResponseFeedback - resetFeedback', () => {
	test('clears all submitted feedback', () => {
		const { submitFeedback, feedbackByResponseId, resetFeedback } = setup();
		submitFeedback('resp-1', { rating: 'up' });
		submitFeedback('resp-2', { rating: 'up' });
		expect(Object.keys(feedbackByResponseId.value)).toHaveLength(2);

		resetFeedback();
		expect(Object.keys(feedbackByResponseId.value)).toHaveLength(0);
	});
});
