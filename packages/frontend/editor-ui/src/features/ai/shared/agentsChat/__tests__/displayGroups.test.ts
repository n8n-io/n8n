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
