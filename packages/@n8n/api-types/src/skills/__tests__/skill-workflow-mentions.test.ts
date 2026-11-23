import {
	formatSkillWorkflowMention,
	parseAgentSkillWorkflowMentions,
	parseSkillWorkflowMentions,
	renameSkillWorkflowMentions,
	replaceSkillWorkflowMentionUrls,
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

	it('keeps a backslash that does not escape a bracket or a backslash', () => {
		expect(parseSkillWorkflowMentions('[Path\\folder](n8n://workflow/abc)')).toEqual([
			{ workflowId: 'abc', name: 'Path\\folder' },
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

	it('writes a name with line breaks on one line, so the link stays a mention', () => {
		const link = formatSkillWorkflowMention({ workflowId: 'abc', name: 'Weekly\r\n report' });

		expect(link).toBe('[Weekly report](n8n://workflow/abc)');
		expect(parseSkillWorkflowMentions(link)).toEqual([
			{ workflowId: 'abc', name: 'Weekly report' },
		]);
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

	it('keeps a mention when the new name has a line break', () => {
		const renamed = renameSkillWorkflowMentions(
			'[Old](n8n://workflow/abc)',
			new Map([['abc', 'Two\nlines']]),
		);

		expect(parseSkillWorkflowMentions(renamed)).toEqual([{ workflowId: 'abc', name: 'Two lines' }]);
	});

	it('returns the body unchanged when no name is known', () => {
		const body = 'See [Name](n8n://workflow/abc) and [Web](https://example.com)';

		expect(renameSkillWorkflowMentions(body, new Map())).toBe(body);
	});
});

describe('parseAgentSkillWorkflowMentions', () => {
	it('returns each workflow once, from the instructions and then the references', () => {
		const skill = {
			instructions: 'Run [Report](n8n://workflow/wf1).',
			references: [
				{ path: 'references/a.md', content: 'Then [Archive](n8n://workflow/wf2).' },
				{ path: 'references/b.md', content: 'Or [Report again](n8n://workflow/wf1).' },
			],
		};

		expect(parseAgentSkillWorkflowMentions(skill)).toEqual([
			{ workflowId: 'wf1', name: 'Report' },
			{ workflowId: 'wf2', name: 'Archive' },
		]);
	});
});

describe('replaceSkillWorkflowMentionUrls', () => {
	it('points each mention at the given URL and keeps its link text', () => {
		const body = 'Run [A \\] b](n8n://workflow/wf1?instance=x) and [Web](https://example.com).';

		expect(replaceSkillWorkflowMentionUrls(body, (id) => `/workflow/${id}`)).toBe(
			'Run [A \\] b](/workflow/wf1) and [Web](https://example.com).',
		);
	});
});
