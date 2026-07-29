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
				toolCalls: [{ tool: 'write_file', toolCallId: 'tc2', state: 'error' }],
			},
			{
				id: 'exec-2:final',
				role: 'assistant',
				content: 'failed to write',
				executionId: 'exec-2',
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
			expect(groups[1].finalMessage).toBeUndefined();
			expect(groups[2].executionId).toBe('exec-2');
			expect(groups[2].toolCalls.map((tc) => tc.toolCallId)).toEqual(['tc2']);
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
