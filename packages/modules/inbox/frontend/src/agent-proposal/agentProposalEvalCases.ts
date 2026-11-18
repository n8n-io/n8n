import {
	isAgentProposalArmPass,
	isAgentProposalRegression,
	type AgentProposalCaseArm,
	type AgentProposalCaseResult,
} from '@n8n/api-types';

import { splitExpectedTools } from './agentProposalChangeFields';

/**
 * `error`: the run or its check did not finish. It is not a failed check.
 * `skipped`: the case has no check to grade.
 */
export type AgentProposalArmStatus = 'pass' | 'fail' | 'error' | 'skipped';

export function armStatus(arm: AgentProposalCaseArm): AgentProposalArmStatus {
	if (arm.status === 'error' || arm.verdict.status === 'error') return 'error';
	if (arm.verdict.status === 'skipped') return 'skipped';
	return isAgentProposalArmPass(arm) ? 'pass' : 'fail';
}

/** The version that the owner gets when the proposal is applied. */
const resultingArm = (result: AgentProposalCaseResult) => result.proposed ?? result.published;

function rank(result: AgentProposalCaseResult) {
	if (isAgentProposalRegression(result)) return 0;
	return isAgentProposalArmPass(resultingArm(result)) ? 2 : 1;
}

/** Newly failing cases first, then the other failing cases, then the passing cases. */
export function orderCaseResults(cases: AgentProposalCaseResult[]): AgentProposalCaseResult[] {
	// `sort` is stable, so cases of one group keep the order of the test run.
	return [...cases].sort((a, b) => rank(a) - rank(b));
}

export type AgentProposalEvalSummary = {
	total: number;
	publishedPassed: number;
	/** `null` when no proposed version ran (a proposal without an agent edit). */
	proposedPassed: number | null;
	/** Cases that the published version passed and the proposed version did not. */
	newlyFailing: number;
	/** Cases that the published version did not pass and the proposed version passed. */
	fixed: number;
};

export function summarizeCaseResults(cases: AgentProposalCaseResult[]): AgentProposalEvalSummary {
	const compared = cases.flatMap(({ published, proposed }) =>
		proposed ? [{ published, proposed }] : [],
	);
	return {
		total: cases.length,
		publishedPassed: cases.filter(({ published }) => isAgentProposalArmPass(published)).length,
		proposedPassed:
			compared.length > 0
				? compared.filter(({ proposed }) => isAgentProposalArmPass(proposed)).length
				: null,
		newlyFailing: cases.filter(isAgentProposalRegression).length,
		fixed: compared.filter(
			({ published, proposed }) =>
				!isAgentProposalArmPass(published) && isAgentProposalArmPass(proposed),
		).length,
	};
}

/** Tool data as text. A string stays as it is, so it shows without quotes. */
export function formatToolData(value: unknown): string {
	if (typeof value === 'string') return value;
	return JSON.stringify(value, null, 2) ?? String(value);
}

/**
 * One line of the checklist of a version.
 * `tool`: the version called a required tool, or did not call a forbidden tool, when `pass` is true.
 * `rule`: `notChecked` means that the judge did not run because a tool check failed.
 */
export type AgentProposalArmCheck =
	| { kind: 'tool'; tool: string; expectation: 'required' | 'forbidden'; pass: boolean }
	| { kind: 'rule'; state: 'pass' | 'fail' | 'notChecked' | 'error'; reasoning: string | null };

export function armChecks(
	result: AgentProposalCaseResult,
	arm: AgentProposalCaseArm,
): AgentProposalArmCheck[] {
	if (arm.status !== 'success') return [];
	const { verdict } = arm;
	const checks: AgentProposalArmCheck[] = [];

	if (verdict.toolCheck) {
		const { missing, forbidden } = verdict.toolCheck;
		const expected = splitExpectedTools(result.expectedTools);
		for (const tool of expected.required) {
			checks.push({ kind: 'tool', tool, expectation: 'required', pass: !missing.includes(tool) });
		}
		for (const tool of expected.forbidden) {
			checks.push({
				kind: 'tool',
				tool,
				expectation: 'forbidden',
				pass: !forbidden.includes(tool),
			});
		}
	}

	if (!result.criteria && !result.expectedOutput) return checks;
	if (verdict.toolCheck && !verdict.toolCheck.pass) {
		// The judge does not run after a failed tool check, so the reasoning only repeats the tool check.
		checks.push({ kind: 'rule', state: 'notChecked', reasoning: null });
	} else if (verdict.status === 'error') {
		checks.push({ kind: 'rule', state: 'error', reasoning: null });
	} else if (verdict.status === 'completed') {
		checks.push({
			kind: 'rule',
			state: verdict.outcome === 'pass' ? 'pass' : 'fail',
			reasoning: verdict.reasoning,
		});
	}
	return checks;
}

/** The tools that a version called but must not call. */
export function forbiddenCalls(arm: AgentProposalCaseArm): Set<string> {
	return new Set(arm.verdict.toolCheck?.forbidden ?? []);
}
