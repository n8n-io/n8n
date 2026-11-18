import { extractTourSteps } from '../page-tour';

describe('extractTourSteps', () => {
	it('should give one step for each block that links to a node, in the order of the text', () => {
		const markdown = [
			'# Order sync',
			'',
			'The [Webhook](/workflow/w1/n1) node receives the order.',
			'',
			'This paragraph links to no node.',
			'',
			'- Then [Set](/workflow/w1/n2) cleans the fields.',
			'- And [Slack](/workflow/w1/n3) tells the team.',
		].join('\n');

		expect(extractTourSteps(markdown)).toEqual({
			workflowId: 'w1',
			steps: [
				{ nodeIds: ['n1'], text: 'The Webhook node receives the order.' },
				{ nodeIds: ['n2'], text: 'Then Set cleans the fields.' },
				{ nodeIds: ['n3'], text: 'And Slack tells the team.' },
			],
		});
	});

	it('should visit the requested workflow when the text links to nodes of several workflows', () => {
		const markdown = ['Start at [A](/workflow/w1/a).', '', 'Then [B](/workflow/w2/b).'].join('\n');

		expect(extractTourSteps(markdown, undefined, 'w2')).toEqual({
			workflowId: 'w2',
			steps: [{ nodeIds: ['b'], text: 'Then B.' }],
		});
	});

	it('should give no tour when the text links to no node of the requested workflow', () => {
		expect(extractTourSteps('Start at [A](/workflow/w1/a).', undefined, 'w3')).toBeUndefined();
	});

	it('should visit only the workflow of the first node link', () => {
		const markdown = [
			'See [the workflow](/workflow/w0) first.',
			'',
			'Start at [A](/workflow/w1/a).',
			'',
			'Another workflow has [B](/workflow/w2/b).',
			'',
			'Back to [C](/workflow/w1/c) and [D](/workflow/w2/d).',
		].join('\n');

		expect(extractTourSteps(markdown)).toEqual({
			workflowId: 'w1',
			steps: [
				{ nodeIds: ['a'], text: 'Start at A.' },
				{ nodeIds: ['c'], text: 'Back to C and D.' },
			],
		});
	});

	it('should list every node of a block once', () => {
		const markdown = '[A](/workflow/w1/a) sends to [B](/workflow/w1/b), then [A](/workflow/w1/a).';

		expect(extractTourSteps(markdown)?.steps).toEqual([
			{ nodeIds: ['a', 'b'], text: 'A sends to B, then A.' },
		]);
	});

	it('should join the lines of a paragraph and keep a heading as its own block', () => {
		const markdown = [
			'## The [Trigger](/workflow/w1/t)',
			'First line about [Set](/workflow/w1/s)',
			'second line.',
		].join('\n');

		expect(extractTourSteps(markdown)?.steps).toEqual([
			{ nodeIds: ['t'], text: 'The Trigger' },
			{ nodeIds: ['s'], text: 'First line about Set second line.' },
		]);
	});

	it.each([
		['1. **Bold** [Set](/workflow/w1/s) step', 'Bold Set step'],
		['- [x] Check `code` in [Set](/workflow/w1/s)', 'Check code in Set'],
		['> Quote of *the* [Set](/workflow/w1/s) node', 'Quote of the Set node'],
		['[Set \\[v2\\]](/workflow/w1/s) keeps my_field_name', 'Set [v2] keeps my_field_name'],
		['![diagram](/img.png) of [Set](</workflow/w1/s> "title")', 'diagram of Set'],
		[
			'Open [the docs](https://example.com/workflow/x/y), then [Set](/workflow/w1/s)',
			'Open the docs, then Set',
		],
	])('should clean the text of "%s"', (markdown, text) => {
		expect(extractTourSteps(markdown)?.steps).toEqual([{ nodeIds: ['s'], text }]);
	});

	it('should read a link with an empty label as the name of the node', () => {
		const names: Record<string, string> = { s: 'Edit Fields' };
		const markdown = 'First [](/workflow/w1/s), then [](/workflow/w1/unknown).';

		expect(extractTourSteps(markdown, (nodeId) => names[nodeId])?.steps).toEqual([
			{ nodeIds: ['s', 'unknown'], text: 'First Edit Fields, then .' },
		]);
	});

	it('should leave out the links of a code block', () => {
		const markdown = ['```', '[A](/workflow/w1/a)', '```', '', '[B](/workflow/w2/b)'].join('\n');

		expect(extractTourSteps(markdown)).toEqual({
			workflowId: 'w2',
			steps: [{ nodeIds: ['b'], text: 'B' }],
		});
	});

	it.each(['', 'No link here.', 'A [workflow](/workflow/w1) and a [page](/page/p1).'])(
		'should give no tour for "%s"',
		(markdown) => {
			expect(extractTourSteps(markdown)).toBeUndefined();
		},
	);
});
