import type {
	BreakingChangeLightReportResult,
	BreakingChangeWorkflowRuleResult,
	BreakingChangeVersion,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest, get } from '../utils';

type BreakingChangeQuery = {
	version?: BreakingChangeVersion;
};

export async function getReport(
	context: IRestApiContext,
	query?: BreakingChangeQuery,
): Promise<BreakingChangeLightReportResult> {
	return (await get(context.baseUrl, '/breaking-changes/report', query)).data;
}

export async function refreshReport(
	context: IRestApiContext,
	query?: BreakingChangeQuery,
): Promise<BreakingChangeLightReportResult> {
	const refreshUrl = query?.version
		? `/breaking-changes/report/refresh?version=${query.version}`
		: '/breaking-changes/report/refresh';

	return await makeRestApiRequest(context, 'POST', refreshUrl);
}

export async function getReportForRule(
	context: IRestApiContext,
	ruleId: string,
): Promise<BreakingChangeWorkflowRuleResult> {
	return (await get(context.baseUrl, `/breaking-changes/report/${ruleId}`)).data;
}
