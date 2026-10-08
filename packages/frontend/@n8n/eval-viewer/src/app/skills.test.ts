import { describe, expect, it } from 'vitest';

import type { ModelStep, TranscriptItem, Turn } from '../schema';
import { skillFileOf, skillsOf } from './skills';

type ToolItem = Extract<TranscriptItem, { kind: 'tool' }>;

const tool = (id: string, args: unknown, result: unknown): ToolItem => ({
	kind: 'tool',
	id,
	tool: 'load_skill',
	args,
	hasResult: true,
	result,
	failed: false,
});

const step = (calls: Array<[string, string | null]>): ModelStep => ({
	index: 0,
	startMs: 0,
	modelMs: 0,
	toolWindowMs: null,
	finishReason: null,
	modelId: null,
	usage: null,
	reasoning: null,
	toolCalls: calls.map(([id, skill]) => ({ id, tool: 'load_skill', skill })),
});

const turns: Turn[] = [
	{
		userMessage: 'build it',
		items: [
			tool(
				'c1',
				{ skillId: 'builder' },
				{
					skillId: 'builder',
					content: 'The skill instructions are active.',
					linkedFiles: {
						references: [
							{ path: 'references/a.md', bytes: 10 },
							{ path: 'references/b.md', bytes: 20 },
						],
					},
				},
			),
			tool('c2', { skillId: 'builder', filePath: 'references/b.md' }, { content: '# B' }),
			tool('c3', { skillId: 'builder', filePath: 'references/extra.md' }, { content: '# Extra' }),
			tool('c4', { skillId: 'other' }, { skillId: 'other' }),
		],
		steps: [
			step([['c1', '# Builder']]),
			step([
				['c2', null],
				['c3', null],
				['c4', null],
			]),
		],
	},
];

describe('skillsOf', () => {
	it('joins the skill markdown, the listed references and the loaded references', () => {
		expect(skillsOf(turns)).toEqual(
			new Map([
				[
					'builder',
					{
						id: 'builder',
						content: '# Builder',
						references: [
							{ path: 'references/a.md', bytes: 10, content: null },
							{ path: 'references/b.md', bytes: 20, content: '# B' },
							{ path: 'references/extra.md', bytes: null, content: '# Extra' },
						],
					},
				],
				['other', { id: 'other', content: null, references: [] }],
			]),
		);
	});
});

describe('skillFileOf', () => {
	it('reads the skill and the file a load_skill call asked for', () => {
		expect(skillFileOf(turns[0].items[0])).toEqual({ skillId: 'builder', filePath: null });
		expect(skillFileOf(turns[0].items[1])).toEqual({
			skillId: 'builder',
			filePath: 'references/b.md',
		});
		expect(skillFileOf({ ...tool('x', { skillId: 'a' }, null), tool: 'nodes' })).toBeNull();
		expect(skillFileOf(tool('y', { name: 'by-name' }, null))).toEqual({
			skillId: 'by-name',
			filePath: null,
		});
		expect(skillFileOf(tool('z', {}, { skillId: 'from-result' }))).toEqual({
			skillId: 'from-result',
			filePath: null,
		});
	});
});
