import { addedWorkflowMentionIds } from '../utils/skill-workflow-mentions';

const mention = (id: string) => `[Workflow ${id}](n8n://workflow/${id})`;

describe('addedWorkflowMentionIds', () => {
	it.each([
		['a new skill', { instructions: mention('a') }, undefined, ['a']],
		[
			'mentions in references',
			{ instructions: 'x', references: [{ path: 'references/r.md', content: mention('b') }] },
			undefined,
			['b'],
		],
		['a repeated mention', { instructions: `${mention('a')} ${mention('a')}` }, undefined, ['a']],
		[
			'a mention that the previous version has',
			{ instructions: `${mention('a')} ${mention('b')}` },
			{ instructions: mention('a') },
			['b'],
		],
		[
			'a mention moved to a reference',
			{ instructions: 'x', references: [{ path: 'references/r.md', content: mention('a') }] },
			{ instructions: mention('a') },
			[],
		],
		[
			'a renamed mention',
			{ instructions: '[New name](n8n://workflow/a)' },
			{ instructions: '[Old name](n8n://workflow/a)' },
			[],
		],
		['a removed mention', { instructions: 'x' }, { instructions: mention('a') }, []],
	])('%s', (_case, next, previous, expected) => {
		expect(addedWorkflowMentionIds(next, previous)).toEqual(expected);
	});
});
