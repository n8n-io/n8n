import {
	isAgentProposalArmPass,
	isAgentProposalRegression,
	type AgentProposalCaseArm,
	type AgentProposalCaseResult,
} from '@n8n/api-types';

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
