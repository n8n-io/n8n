import { buildToolDraftPrompt, parseToolDraftAnswer, type ToolDraftSource } from '../tool-draft';

const SOURCE: ToolDraftSource = {
	workflowName: 'Campaign numbers',
	workflowDescription: 'Reads the numbers from HubSpot',
	inputSchema: {
		type: 'object',
		properties: {
			campaign_id: { type: ['string', 'null'] },
			days: { type: 'number' },
			filters: {},
		},
		additionalProperties: false,
	},
	nodeNames: ['Start', 'HubSpot', 'Summarize'],
};

describe('buildToolDraftPrompt', () => {
	it('gives the model the workflow name, the description, the inputs, and the node names', () => {
		const prompt = buildToolDraftPrompt(SOURCE);

		expect(prompt).toContain('Campaign numbers');
		expect(prompt).toContain('Reads the numbers from HubSpot');
		expect(prompt).toContain('campaign_id (string)');
		expect(prompt).toContain('days (number)');
		expect(prompt).toContain('filters (any)');
		expect(prompt).toContain('Start, HubSpot, Summarize');
		expect(prompt).toContain('"toolName"');
		expect(prompt).toContain('"description"');
	});

	it('says when the workflow has no description and no inputs', () => {
		const prompt = buildToolDraftPrompt({
			...SOURCE,
			workflowDescription: null,
			inputSchema: { type: 'object', additionalProperties: true },
		});

		expect(prompt).toMatch(/Workflow description: none/);
		expect(prompt).toMatch(/Inputs: none/);
	});

	it('asks for one field only, and gives the current text, for "Generate"', () => {
		const prompt = buildToolDraftPrompt(SOURCE, {
			field: 'description',
			current: { toolName: 'get_campaign', description: 'Old text.' },
		});

		expect(prompt).toContain('Old text.');
		expect(prompt).toContain('"description"');
		expect(prompt).not.toContain('"toolName"');
	});

	it('asks for a text that differs from the current one, for "Generate"', () => {
		const prompt = buildToolDraftPrompt(SOURCE, {
			field: 'toolName',
			current: { toolName: 'get_campaign', description: 'Old text.' },
		});

		expect(prompt).toContain('The current tool name: get_campaign');
		expect(prompt).toMatch(/must differ from the current text/);
	});
});

describe('parseToolDraftAnswer', () => {
	it('takes the tool name and the description from a JSON answer', () => {
		const answer =
			'{"toolName": "get_campaign_numbers", "description": "Returns the numbers of one campaign."}';

		expect(parseToolDraftAnswer(answer)).toEqual({
			ok: true,
			draft: {
				toolName: 'get_campaign_numbers',
				description: 'Returns the numbers of one campaign.',
			},
		});
	});

	it.each([
		['upper case letters', 'Get_Campaign'],
		['a dash', 'get-campaign'],
		['a space', 'get campaign'],
		['more than 64 characters', 'a'.repeat(65)],
		['an empty name', ''],
	])('refuses a tool name with %s', (_case, toolName) => {
		const answer = JSON.stringify({ toolName, description: 'Returns the numbers.' });

		expect(parseToolDraftAnswer(answer)).toEqual({
			ok: false,
			error: expect.stringContaining('tool name'),
		});
	});

	it.each([
		['an empty description', '   '],
		['more than 2000 characters', 'a'.repeat(2001)],
		['no text', 42],
	])('refuses %s', (_case, description) => {
		const answer = JSON.stringify({ toolName: 'get_campaign', description });

		expect(parseToolDraftAnswer(answer)).toEqual({
			ok: false,
			error: expect.stringContaining('description'),
		});
	});

	it('trims the description', () => {
		const answer = JSON.stringify({ toolName: 'get_campaign', description: '  Returns it.\n' });

		expect(parseToolDraftAnswer(answer)).toMatchObject({
			ok: true,
			draft: { description: 'Returns it.' },
		});
	});

	it.each([
		['prose without JSON', 'Sure! I can help with that.'],
		['a JSON list', '["get_campaign"]'],
		['an empty answer', ''],
	])('refuses %s', (_case, answer) => {
		expect(parseToolDraftAnswer(answer)).toEqual({
			ok: false,
			error: expect.stringContaining('JSON object'),
		});
	});

	it('finds the JSON in a fenced block after some prose', () => {
		const answer = [
			'Here is the draft:',
			'```json',
			'{"toolName": "get_campaign", "description": "Returns one campaign."}',
			'```',
		].join('\n');

		expect(parseToolDraftAnswer(answer)).toEqual({
			ok: true,
			draft: { toolName: 'get_campaign', description: 'Returns one campaign.' },
		});
	});

	it('takes only the field that the builder asked for', () => {
		const answer = JSON.stringify({ toolName: 'Bad Name', description: 'Returns one campaign.' });

		expect(parseToolDraftAnswer(answer, 'description')).toEqual({
			ok: true,
			draft: { description: 'Returns one campaign.' },
		});
	});

	it('refuses an answer without the field that the builder asked for', () => {
		const answer = JSON.stringify({ description: 'Returns one campaign.' });

		expect(parseToolDraftAnswer(answer, 'toolName')).toEqual({
			ok: false,
			error: expect.stringContaining('tool name'),
		});
	});
});
