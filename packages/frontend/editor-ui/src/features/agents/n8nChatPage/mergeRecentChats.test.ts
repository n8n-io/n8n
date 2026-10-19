import type { InstanceAiThreadSummary, AgentN8nChatThreadSummary } from '@n8n/api-types';

import { mergeRecentChats, mergeChatHistoryPages, type RecentChatItem } from './mergeRecentChats';

const assistantThread = (id: string, updatedAt: string): InstanceAiThreadSummary => ({
	id,
	title: `Assistant ${id}`,
	createdAt: updatedAt,
	updatedAt,
});

const agentThread = (id: string, updatedAt: string): AgentN8nChatThreadSummary => ({
	id,
	title: `Agent ${id}`,
	updatedAt,
	agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
});

describe('mergeRecentChats', () => {
	it('interleaves both sources by updatedAt, newest first', () => {
		const assistant = [assistantThread('a1', '2026-01-03T00:00:00.000Z')];
		const agent = [
			agentThread('g1', '2026-01-04T00:00:00.000Z'),
			agentThread('g2', '2026-01-02T00:00:00.000Z'),
		];

		const result = mergeRecentChats(assistant, agent, { limit: 5 });

		expect(result).toEqual([
			{ kind: 'agent', thread: agent[0] },
			{ kind: 'assistant', thread: assistant[0] },
			{ kind: 'agent', thread: agent[1] },
		]);
	});

	it('caps the result at limit', () => {
		// Newest first, as the real (already-sorted) API responses are.
		const assistant = [2, 1, 0].map((i) =>
			assistantThread(`a${i}`, `2026-01-0${i + 1}T00:00:00.000Z`),
		);
		const agent = [2, 1, 0].map((i) => agentThread(`g${i}`, `2026-01-1${i}T00:00:00.000Z`));

		const result = mergeRecentChats(assistant, agent, { limit: 2 });

		expect(result).toHaveLength(2);
		expect(result.map((item) => item.thread.id)).toEqual(['g2', 'g1']);
	});

	it('keeps the open thread when it falls outside the limit', () => {
		const assistant = [assistantThread('old', '2026-01-01T00:00:00.000Z')];
		// Newest first, as the real (already-sorted) API responses are.
		const agent = [4, 3, 2, 1, 0].map((i) => agentThread(`g${i}`, `2026-01-1${i}T00:00:00.000Z`));

		const result = mergeRecentChats(assistant, agent, { limit: 5, openThreadId: 'old' });

		expect(result).toHaveLength(5);
		expect(result.at(-1)).toEqual({ kind: 'assistant', thread: assistant[0] });
	});

	it('does not duplicate the open thread when it is already within the limit', () => {
		const assistant = [assistantThread('a1', '2026-01-05T00:00:00.000Z')];
		const result = mergeRecentChats(assistant, [], { limit: 5, openThreadId: 'a1' });

		expect(result).toEqual([{ kind: 'assistant', thread: assistant[0] }]);
	});

	it('skips an open thread id that is not among the loaded threads, without fetching', () => {
		const assistant = [assistantThread('a1', '2026-01-05T00:00:00.000Z')];
		const result = mergeRecentChats(assistant, [], { limit: 5, openThreadId: 'not-loaded' });

		expect(result).toEqual([{ kind: 'assistant', thread: assistant[0] }]);
	});
});

describe('mergeChatHistoryPages', () => {
	const item = (kind: RecentChatItem['kind'], id: string, updatedAt: string): RecentChatItem =>
		kind === 'assistant'
			? { kind, thread: assistantThread(id, updatedAt) }
			: { kind, thread: agentThread(id, updatedAt) };

	it('merges and sorts every loaded item when no source has more pages', () => {
		const result = mergeChatHistoryPages([
			{ items: [item('assistant', 'a1', '2026-01-02T00:00:00.000Z')], hasMore: false },
			{ items: [item('agent', 'g1', '2026-01-03T00:00:00.000Z')], hasMore: false },
		]);

		expect(result.map((i) => i.thread.id)).toEqual(['g1', 'a1']);
	});

	it('hides items older than the oldest-loaded item of a source that still has more', () => {
		const result = mergeChatHistoryPages([
			// Exhausted — every item is trustworthy.
			{
				items: [
					item('assistant', 'a1', '2026-01-10T00:00:00.000Z'),
					item('assistant', 'a2', '2026-01-01T00:00:00.000Z'),
				],
				hasMore: false,
			},
			// Still paging — anything older than its own oldest loaded (01-05) is unsafe to show.
			{ items: [item('agent', 'g1', '2026-01-05T00:00:00.000Z')], hasMore: true },
		]);

		// a2 (01-01) is older than the agent source's cutoff (01-05) and is hidden.
		expect(result.map((i) => i.thread.id)).toEqual(['a1', 'g1']);
	});

	it('takes the stricter (newer) cutoff when multiple sources still have more pages', () => {
		const result = mergeChatHistoryPages([
			{ items: [item('assistant', 'a1', '2026-01-05T00:00:00.000Z')], hasMore: true },
			{ items: [item('agent', 'g1', '2026-01-08T00:00:00.000Z')], hasMore: true },
		]);

		// The agent source's cutoff (01-08) is stricter than assistant's (01-05); a1 is hidden.
		expect(result.map((i) => i.thread.id)).toEqual(['g1']);
	});

	it('hides everything from a still-paging source with nothing loaded yet', () => {
		const result = mergeChatHistoryPages([
			{ items: [item('assistant', 'a1', '2026-01-05T00:00:00.000Z')], hasMore: false },
			{ items: [], hasMore: true },
		]);

		expect(result).toEqual([]);
	});
});
