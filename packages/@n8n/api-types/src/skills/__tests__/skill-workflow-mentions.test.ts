import {
	formatSkillWorkflowMention,
	parseSkillWorkflowMentions,
	renameSkillWorkflowMentions,
} from '../skill-workflow-mentions';

describe('parseSkillWorkflowMentions', () => {
	it('returns the workflow ID and link text of each mention, in body order', () => {
		const body = [
			'First call [Create project](n8n://workflow/abc123).',
			'Then call [Send report](n8n://workflow/Xy_-9).',
		].join('\n');

		expect(parseSkillWorkflowMentions(body)).toEqual([
			{ workflowId: 'abc123', name: 'Create project' },
			{ workflowId: 'Xy_-9', name: 'Send report' },
		]);
	});

	it('returns each workflow once, with the link text of its first mention', () => {
		const body = '[One](n8n://workflow/abc) and [Two](n8n://workflow/abc)';

		expect(parseSkillWorkflowMentions(body)).toEqual([{ workflowId: 'abc', name: 'One' }]);
	});

	it('accepts query parameters after the workflow ID', () => {
		const body = '[Remote](n8n://workflow/abc?instance=https%3A%2F%2Fexample.com&x=1)';

		expect(parseSkillWorkflowMentions(body)).toEqual([{ workflowId: 'abc', name: 'Remote' }]);
	});

	it('accepts empty link text', () => {
		expect(parseSkillWorkflowMentions('[](n8n://workflow/abc)')).toEqual([
			{ workflowId: 'abc', name: '' },
		]);
	});

	it('reads escaped brackets in the link text', () => {
		expect(parseSkillWorkflowMentions('[Run \\[v2\\]](n8n://workflow/abc)')).toEqual([
			{ workflowId: 'abc', name: 'Run [v2]' },
		]);
	});

	it('starts the link text after the last unescaped opening bracket', () => {
		expect(parseSkillWorkflowMentions('a [b and [Create](n8n://workflow/abc)')).toEqual([
			{ workflowId: 'abc', name: 'Create' },
		]);
	});

	it.each([
		['link text across lines', '[Two\nlines](n8n://workflow/abc)'],
		['plain text', 'n8n://workflow/abc'],
		['another n8n link', '[Ref](n8n://workflow-sdk/reference)'],
		['a web link', '[Open](https://example.com/workflow/abc)'],
		['a link without an ID', '[Empty](n8n://workflow/)'],
		['a link with a path after the ID', '[Nested](n8n://workflow/abc/def)'],
		['a link with a space', '[Space](n8n://workflow/abc def)'],
	])('ignores %s', (_, body) => {
		expect(parseSkillWorkflowMentions(body)).toEqual([]);
	});

	it('returns an empty list for a body without mentions', () => {
		expect(parseSkillWorkflowMentions('No workflows here.')).toEqual([]);
	});
});

describe('formatSkillWorkflowMention', () => {
	it('writes a markdown link', () => {
		expect(formatSkillWorkflowMention({ workflowId: 'abc', name: 'Create project' })).toBe(
			'[Create project](n8n://workflow/abc)',
		);
	});

	it.each(['Run [v2]', 'Back\\slash', 'Plain'])('keeps the name "%s" after a parse', (name) => {
		const link = formatSkillWorkflowMention({ workflowId: 'abc', name });

		expect(parseSkillWorkflowMentions(link)).toEqual([{ workflowId: 'abc', name }]);
	});
});

describe('renameSkillWorkflowMentions', () => {
	it('replaces the link text of each mention with the new name', () => {
		const body =
			'Call [Old](n8n://workflow/abc) and [Old](n8n://workflow/abc) then [Keep](n8n://workflow/xyz).';

		expect(renameSkillWorkflowMentions(body, new Map([['abc', 'New [v2]']]))).toBe(
			'Call [New \\[v2\\]](n8n://workflow/abc) and [New \\[v2\\]](n8n://workflow/abc) then [Keep](n8n://workflow/xyz).',
		);
	});

	it('keeps the query parameters and escaped link text of other mentions', () => {
		const body = '[A \\] b](n8n://workflow/abc?instance=x) [C \\] d](n8n://workflow/xyz)';

		expect(renameSkillWorkflowMentions(body, new Map([['abc', 'Renamed']]))).toBe(
			'[Renamed](n8n://workflow/abc?instance=x) [C \\] d](n8n://workflow/xyz)',
		);
	});

	it('returns the body unchanged when no name is known', () => {
		const body = 'See [Name](n8n://workflow/abc) and [Web](https://example.com)';

		expect(renameSkillWorkflowMentions(body, new Map())).toBe(body);
	});
});
