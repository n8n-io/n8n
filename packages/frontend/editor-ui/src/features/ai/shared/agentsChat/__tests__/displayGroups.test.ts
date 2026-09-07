import { describe, expect, it } from 'vitest';

import { buildDisplayGroups, isGroupable } from '../displayGroups';
import type { AgentsChatMessage } from '../types';

describe('shared agents chat display groups', () => {
	it('folds consecutive assistant tool-only messages into one tool run', () => {
		const messages: AgentsChatMessage[] = [
			{ id: 'u1', role: 'user', content: 'start' },
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: 'search', toolCallId: 'tc1', state: 'done' }],
			},
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: 'write', toolCallId: 'tc2', state: 'running' }],
			},
			{ id: 'a3', role: 'assistant', content: 'finished' },
		];

		const groups = buildDisplayGroups(messages);

		expect(groups).toHaveLength(2);
		expect(groups[1].kind).toBe('toolRun');
		if (groups[1].kind === 'toolRun') {
			expect(groups[1].toolCalls.map((tc) => tc.toolCallId)).toEqual(['tc1', 'tc2']);
			expect(groups[1].finalMessage?.id).toBe('a3');
		}
	});

	it('clears awaiting input when a later folded message resolves the interactive', () => {
		const messages: AgentsChatMessage[] = [
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				status: 'awaitingUser',
				toolCalls: [{ tool: 'approval', toolCallId: 'tc1', state: 'suspended' }],
				interactive: {
					toolName: 'approval',
					toolCallId: 'tc1',
					input: { type: 'approval', toolName: 'publish', args: {} },
				},
			},
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				status: 'success',
				toolCalls: [{ tool: 'approval', toolCallId: 'tc1', state: 'done' }],
				interactive: {
					toolName: 'approval',
					toolCallId: 'tc1',
					input: { type: 'approval', toolName: 'publish', args: {} },
					resolvedAt: 1,
					resolvedValue: { approved: true },
				},
			},
		];

		const [group] = buildDisplayGroups(messages);
		expect(group.kind).toBe('toolRun');
		if (group.kind !== 'toolRun') return;
		expect(group.awaitingInput).toBe(false);
		expect(group.interactives[0].resolvedAt).toBe(1);
	});

	it('keeps reasoning segments in order when folding a tool run', () => {
		const messages: AgentsChatMessage[] = [
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				thinkingSegments: [{ id: 'r1', content: 'Plan the search.', startTime: 1, endTime: 2 }],
				toolCalls: [{ tool: 'search', toolCallId: 'tc1', state: 'done' }],
			},
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				thinkingSegments: [{ id: 'r2', content: 'Review the result.', startTime: 3, endTime: 4 }],
				toolCalls: [{ tool: 'write', toolCallId: 'tc2', state: 'done' }],
			},
		];

		const [group] = buildDisplayGroups(messages);
		expect(group.kind).toBe('toolRun');
		if (group.kind !== 'toolRun') return;
		expect(group.thinkingSegments.map((segment) => segment.id)).toEqual(['r1', 'r2']);
	});

	it('keeps executionId on folded toolRun groups', () => {
		const messages: AgentsChatMessage[] = [
			{ id: 'u1', role: 'user', content: 'start', executionId: 'exec-1' },
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				executionId: 'exec-1',
				toolCalls: [{ tool: 'search', toolCallId: 'tc1', state: 'done' }],
			},
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				executionId: 'exec-1',
				toolCalls: [{ tool: 'write', toolCallId: 'tc2', state: 'error' }],
			},
			{ id: 'a3', role: 'assistant', content: 'finished', executionId: 'exec-1' },
		];

		const groups = buildDisplayGroups(messages);
		expect(groups[1].kind).toBe('toolRun');
		if (groups[1].kind === 'toolRun') {
			expect(groups[1].executionId).toBe('exec-1');
		}
	});

	it('does not fold tool-only assistants with different executionIds (HITL resume history)', () => {
		// Suspended turn has no user message on the resume execution, so history
		// is user → tool-only assistant (exec-1) → tool-only + final (exec-2).
		// Folding those would keep exec-1 via ??= while the error lives on exec-2.
		const messages: AgentsChatMessage[] = [
			{ id: 'exec-1:user', role: 'user', content: 'do it', executionId: 'exec-1' },
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: '',
				executionId: 'exec-1',
				thinkingSegments: [{ id: 'r1', content: 'Plan the first execution.' }],
				toolCalls: [
					{ tool: 'search', toolCallId: 'tc1', state: 'done' },
					{ tool: 'approval', toolCallId: 'tc-hitl', state: 'done' },
				],
			},
			{
				id: 'exec-2:assistant',
				role: 'assistant',
				content: '',
				executionId: 'exec-2',
				thinkingSegments: [{ id: 'r2', content: 'Plan the resumed execution.' }],
				toolCalls: [{ tool: 'write_file', toolCallId: 'tc2', state: 'error' }],
			},
			{
				id: 'exec-2:final',
				role: 'assistant',
				content: 'failed to write',
				executionId: 'exec-2',
				thinkingSegments: [{ id: 'r3', content: 'Explain the failure.' }],
			},
		];

		const groups = buildDisplayGroups(messages);

		expect(groups).toHaveLength(3);
		expect(groups[0].kind).toBe('message');
		expect(groups[1].kind).toBe('toolRun');
		expect(groups[2].kind).toBe('toolRun');
		if (groups[1].kind === 'toolRun' && groups[2].kind === 'toolRun') {
			expect(groups[1].executionId).toBe('exec-1');
			expect(groups[1].toolCalls.map((tc) => tc.toolCallId)).toEqual(['tc1', 'tc-hitl']);
			expect(groups[1].thinkingSegments.map((segment) => segment.id)).toEqual(['r1']);
			expect(groups[1].finalMessage).toBeUndefined();
			expect(groups[2].executionId).toBe('exec-2');
			expect(groups[2].toolCalls.map((tc) => tc.toolCallId)).toEqual(['tc2']);
			expect(groups[2].thinkingSegments.map((segment) => segment.id)).toEqual(['r2', 'r3']);
			expect(groups[2].finalMessage?.id).toBe('exec-2:final');
		}
	});

	it('still folds when earlier messages lack executionId (live stream before done)', () => {
		const messages: AgentsChatMessage[] = [
			{ id: 'u1', role: 'user', content: 'do it' },
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{ tool: 'search', toolCallId: 'tc1', state: 'done' },
					{ tool: 'approval', toolCallId: 'tc-hitl', state: 'done' },
				],
			},
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				executionId: 'exec-2',
				toolCalls: [{ tool: 'write_file', toolCallId: 'tc2', state: 'error' }],
			},
			{ id: 'a3', role: 'assistant', content: 'failed', executionId: 'exec-2' },
		];

		const groups = buildDisplayGroups(messages);

		expect(groups).toHaveLength(2);
		expect(groups[1].kind).toBe('toolRun');
		if (groups[1].kind === 'toolRun') {
			expect(groups[1].executionId).toBe('exec-2');
			expect(groups[1].toolCalls.map((tc) => tc.toolCallId)).toEqual(['tc1', 'tc-hitl', 'tc2']);
			expect(groups[1].finalMessage?.id).toBe('a3');
		}
	});

	it('moves reasoning from narrated tool steps to the final assistant group', () => {
		const messages: AgentsChatMessage[] = [
			{ id: 'u1', role: 'user', content: 'research this', executionId: 'exec-1' },
			{
				id: 'a1',
				role: 'assistant',
				content: 'I will search first.',
				executionId: 'exec-1',
				thinkingSegments: [{ id: 'r1', content: 'Choose the search query.' }],
				toolCalls: [{ tool: 'search', toolCallId: 'tc1', state: 'done' }],
			},
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				executionId: 'exec-1',
				thinkingSegments: [{ id: 'r2', content: 'Review the result.' }],
				toolCalls: [{ tool: 'fetch', toolCallId: 'tc2', state: 'done' }],
			},
			{
				id: 'a3',
				role: 'assistant',
				content: 'Here is the answer.',
				executionId: 'exec-1',
				thinkingSegments: [{ id: 'r3', content: 'Compose the answer.' }],
			},
		];

		const groups = buildDisplayGroups(messages);

		expect(groups).toHaveLength(3);
		expect(groups[1].kind).toBe('message');
		expect(groups[2].kind).toBe('toolRun');
		if (groups[1].kind !== 'message' || groups[2].kind !== 'toolRun') return;
		expect(groups[1].thinkingSegments).toEqual([]);
		expect(groups[2].thinkingSegments.map((segment) => segment.id)).toEqual(['r1', 'r2', 'r3']);
	});

	it('does not group assistant messages with visible text as tool-only messages', () => {
		expect(
			isGroupable({
				id: 'a1',
				role: 'assistant',
				content: 'Visible answer',
				toolCalls: [{ tool: 'search', toolCallId: 'tc1', state: 'done' }],
			}),
		).toBe(false);
	});
});
