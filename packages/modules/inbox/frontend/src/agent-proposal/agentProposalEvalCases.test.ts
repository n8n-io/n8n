import type { AgentProposalCaseArm, AgentProposalCaseResult } from '@n8n/api-types';

import {
	armChecks,
	armStatus,
	formatToolData,
	orderCaseResults,
	summarizeCaseResults,
} from './agentProposalEvalCases';

const arm = (
	outcome: 'pass' | 'fail',
	overrides: Partial<AgentProposalCaseArm> = {},
): AgentProposalCaseArm => ({
	status: 'success',
	answer: 'An answer',
	verdict: { status: 'completed', outcome, reasoning: null },
	toolCalls: [],
	usage: { inputTokens: null, outputTokens: null, costUsd: null, durationMs: null },
	...overrides,
});

const result = (
	caseKey: string,
	published: AgentProposalCaseArm,
	proposed: AgentProposalCaseArm | null,
): AgentProposalCaseResult => ({
	caseKey,
	origin: 'suite',
	motivating: false,
	input: `Input of ${caseKey}`,
	criteria: null,
	expectedOutput: null,
	expectedTools: [],
	published,
	proposed,
});

describe('armStatus', () => {
	it('should give the outcome of a completed check', () => {
		expect(armStatus(arm('pass'))).toBe('pass');
		expect(armStatus(arm('fail'))).toBe('fail');
	});

	it('should give an error when the run did not finish', () => {
		expect(armStatus(arm('pass', { status: 'error' }))).toBe('error');
	});

	it('should give an error when the check did not finish', () => {
		expect(
			armStatus(arm('pass', { verdict: { status: 'error', outcome: null, reasoning: null } })),
		).toBe('error');
	});

	it('should give skipped when the case has no check', () => {
		expect(
			armStatus(arm('pass', { verdict: { status: 'skipped', outcome: null, reasoning: null } })),
		).toBe('skipped');
	});
});

describe('orderCaseResults', () => {
	it('should put newly failing cases first, then other failing cases, then passing cases', () => {
		const cases = [
			result('passing', arm('pass'), arm('pass')),
			result('still-failing', arm('fail'), arm('fail')),
			result('fixed', arm('fail'), arm('pass')),
			result('newly-failing', arm('pass'), arm('fail')),
			result('newly-broken', arm('pass'), arm('pass', { status: 'error' })),
		];

		expect(orderCaseResults(cases).map(({ caseKey }) => caseKey)).toEqual([
			'newly-failing',
			'newly-broken',
			'still-failing',
			'passing',
			'fixed',
		]);
	});

	it('should order a preview by the result of the current agent', () => {
		const cases = [result('passing', arm('pass'), null), result('failing', arm('fail'), null)];

		expect(orderCaseResults(cases).map(({ caseKey }) => caseKey)).toEqual(['failing', 'passing']);
	});

	it('should not change the input list', () => {
		const cases = [result('passing', arm('pass'), null), result('failing', arm('fail'), null)];

		orderCaseResults(cases);

		expect(cases.map(({ caseKey }) => caseKey)).toEqual(['passing', 'failing']);
	});
});

describe('summarizeCaseResults', () => {
	it('should count the results of both versions', () => {
		const summary = summarizeCaseResults([
			result('passing', arm('pass'), arm('pass')),
			result('fixed', arm('fail'), arm('pass')),
			result('newly-failing', arm('pass'), arm('fail')),
			result('still-failing', arm('fail'), arm('fail')),
		]);

		expect(summary).toEqual({
			total: 4,
			publishedPassed: 2,
			proposedPassed: 2,
			newlyFailing: 1,
			fixed: 1,
		});
	});

	it('should give no proposed count for a preview', () => {
		const summary = summarizeCaseResults([
			result('passing', arm('pass'), null),
			result('failing', arm('fail'), null),
		]);

		expect(summary).toEqual({
			total: 2,
			publishedPassed: 1,
			proposedPassed: null,
			newlyFailing: 0,
			fixed: 0,
		});
	});
});

describe('formatToolData', () => {
	it('should keep a string as it is', () => {
		expect(formatToolData('plain text')).toBe('plain text');
	});

	it('should format an object as indented JSON', () => {
		expect(formatToolData({ orderId: 42 })).toBe('{\n  "orderId": 42\n}');
	});
});

describe('armChecks', () => {
	const toolCase = (published: AgentProposalCaseArm): AgentProposalCaseResult => ({
		...result('tools', published, null),
		criteria: 'Gives the order status.',
		expectedTools: ['oms-lookup', '!crm-lookup'],
	});

	it('should mark each tool and skip the rule after a failed tool check', () => {
		const failed = arm('fail', {
			verdict: {
				status: 'completed',
				outcome: 'fail',
				reasoning: 'The agent called these tools that it must not call: crm-lookup.',
				toolCheck: { pass: false, missing: [], forbidden: ['crm-lookup'] },
			},
		});

		expect(armChecks(toolCase(failed), failed)).toEqual([
			{ kind: 'tool', tool: 'oms-lookup', expectation: 'required', pass: true },
			{ kind: 'tool', tool: 'crm-lookup', expectation: 'forbidden', pass: false },
			{ kind: 'rule', state: 'notChecked', reasoning: null },
		]);
	});

	it('should give the judge reasoning after a passed tool check', () => {
		const passed = arm('pass', {
			verdict: {
				status: 'completed',
				outcome: 'pass',
				reasoning: 'It gives the status.',
				toolCheck: { pass: true, missing: [], forbidden: [] },
			},
		});

		expect(armChecks(toolCase(passed), passed)).toContainEqual({
			kind: 'rule',
			state: 'pass',
			reasoning: 'It gives the status.',
		});
	});

	it('should return no checks for a run that did not finish', () => {
		const errored = arm('fail', { status: 'error' });

		expect(armChecks(toolCase(errored), errored)).toEqual([]);
	});

	it('should return no rule check when the case has no rule', () => {
		const passed = arm('pass');

		expect(armChecks(result('plain', passed, null), passed)).toEqual([]);
	});
});
