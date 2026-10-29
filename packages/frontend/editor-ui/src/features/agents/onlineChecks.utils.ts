import type { AgentOnlineRubric, AgentOnlineVerdict } from '@n8n/api-types';

export function onlineResultStatus(verdicts: AgentOnlineVerdict[]): 'good' | 'bad' | 'review' {
	if (verdicts.some((verdict) => verdict.status === 'fail')) return 'bad';
	if (
		verdicts.some((verdict) => verdict.status === 'unsure' || verdict.status === 'not_run') ||
		!verdicts.some((verdict) => verdict.status === 'pass')
	)
		return 'review';
	return 'good';
}

/** Checks that passed, out of the checks that applied. */
export function onlineScore(result: { rubric: AgentOnlineRubric; verdicts: AgentOnlineVerdict[] }) {
	const status = (checkId: string) =>
		result.verdicts.find((verdict) => verdict.checkId === checkId)?.status;
	return {
		passed: result.verdicts.filter((verdict) => verdict.status === 'pass').length,
		total: result.rubric.checks.filter((check) => status(check.id) !== 'not_applicable').length,
	};
}
