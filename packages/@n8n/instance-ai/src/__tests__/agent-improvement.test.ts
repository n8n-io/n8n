import {
	agentImprovementListSessionsInputSchema,
	agentImprovementOutputSchema,
	agentImprovementReadSessionInputSchema,
	agentImprovementTestProposalInputSchema,
} from '../agent-improvement';

const report = {
	summary: 'Clarify when to use each lookup tool',
	report:
		'The agent selected the wrong tool.\n\n' +
		'The change corrects two tool descriptions.\n\n' +
		'The test ran 3 cases with no regressions.',
};

const edit = { kind: 'instructions', after: 'Answer in one paragraph.' };
const evalCase = {
	input: 'Where is order 1001?',
	criteria: 'Gives the status.',
	expectedTools: [],
};

describe('agent improvement output', () => {
	it.each(['proposal', 'no_change'])('accepts the outcome %s', (outcome) => {
		expect(agentImprovementOutputSchema.safeParse({ ...report, outcome }).success).toBe(true);
	});

	it.each([
		{ outcome: 'failed' },
		{ outcome: undefined },
		{ summary: ' ' },
		{ report: ' ' },
		{ report: 'x'.repeat(50_001) },
		{ edits: [] },
	])('rejects invalid output %#', (output) => {
		expect(
			agentImprovementOutputSchema.safeParse({ ...report, outcome: 'proposal', ...output }).success,
		).toBe(false);
	});

	it.each([
		['x'.repeat(80), 'x'.repeat(80)],
		['x'.repeat(81), 'x'.repeat(80)],
		[`${'x'.repeat(79)}😀 trailing text`, `${'x'.repeat(79)}😀`],
	])('caps title %# at 80 code points and keeps the report', (summary, expected) => {
		const output = { ...report, outcome: 'no_change', summary };
		expect(agentImprovementOutputSchema.parse(output)).toEqual({ ...output, summary: expected });
	});

	it('rejects missing and malformed output', () => {
		expect(agentImprovementOutputSchema.safeParse(undefined).success).toBe(false);
		expect(agentImprovementOutputSchema.safeParse('no_change').success).toBe(false);
	});
});

describe('agent improvement tool input', () => {
	it('applies the session list defaults', () => {
		expect(agentImprovementListSessionsInputSchema.parse({})).toEqual({ limit: 20, offset: 0 });
	});

	it.each([{ limit: 0 }, { limit: 51 }, { limit: 1.5 }, { offset: -1 }, { agentId: 'other' }])(
		'rejects an invalid session list input %#',
		(input) => {
			expect(agentImprovementListSessionsInputSchema.safeParse(input).success).toBe(false);
		},
	);

	it('requires a session ID to read a session', () => {
		expect(agentImprovementReadSessionInputSchema.safeParse({ sessionId: 's1' }).success).toBe(
			true,
		);
		expect(agentImprovementReadSessionInputSchema.safeParse({ sessionId: '' }).success).toBe(false);
		expect(agentImprovementReadSessionInputSchema.safeParse({}).success).toBe(false);
	});

	it.each([
		{ edits: [edit], evalCases: [evalCase], regressionCaseIds: ['d:1'] },
		{ edits: [edit], evalCases: [], regressionCaseIds: ['d:1'] },
		{ edits: [], evalCases: [evalCase], regressionCaseIds: [] },
		{
			edits: [
				{ kind: 'toolDescription', toolType: 'node', toolName: 'get_order', after: 'Reads one.' },
				{ kind: 'skill', skillId: 's1', field: 'instructions', after: 'Use short answers.' },
			],
			evalCases: [{ input: 'Where is order 1001?', criteria: null, expectedTools: ['get_order'] }],
			regressionCaseIds: [],
		},
	])('accepts a proposal that has a change and a case %#', (input) => {
		expect(agentImprovementTestProposalInputSchema.safeParse(input).success).toBe(true);
	});

	it('sets motivating to false when a case omits it', () => {
		const parsed = agentImprovementTestProposalInputSchema.parse({
			edits: [],
			evalCases: [evalCase],
			regressionCaseIds: [],
		});
		expect(parsed.evalCases[0].motivating).toBe(false);
	});

	it('removes old text that an edit supplies', () => {
		const parsed = agentImprovementTestProposalInputSchema.parse({
			edits: [{ ...edit, before: 'Old text' }],
			evalCases: [evalCase],
			regressionCaseIds: [],
		});
		expect(parsed.edits).toEqual([edit]);
	});

	it.each([
		['an edit and no case', { edits: [edit], evalCases: [], regressionCaseIds: [] }],
		['only regression cases', { edits: [], evalCases: [], regressionCaseIds: ['d:1'] }],
		[
			'more than 25 cases in total',
			{
				edits: [edit],
				evalCases: Array.from({ length: 13 }, () => evalCase),
				regressionCaseIds: Array.from({ length: 13 }, (_, index) => `d:${index}`),
			},
		],
		[
			'more than 20 edits',
			{
				edits: Array.from({ length: 21 }, () => edit),
				evalCases: [evalCase],
				regressionCaseIds: [],
			},
		],
		[
			'a case with no rule and no expected tools',
			{
				edits: [edit],
				evalCases: [{ input: 'Hello', criteria: null, expectedTools: [] }],
				regressionCaseIds: [],
			},
		],
		[
			'an unknown field',
			{ edits: [edit], evalCases: [evalCase], regressionCaseIds: [], agentId: 'other' },
		],
		['a missing list', { edits: [edit], evalCases: [evalCase] }],
	])('rejects %s', (_name, input) => {
		expect(agentImprovementTestProposalInputSchema.safeParse(input).success).toBe(false);
	});
});
