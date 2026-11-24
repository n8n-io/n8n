import type {
	BreakingChangeLightReportResult,
	BreakingChangeRuleDetailResult,
	BreakingChangeVersion,
	MigrationFindingTriageStatus,
	MigrationNotifyResult,
	MigrationOwnerCandidate,
	MigrationWorkflowOwnerResponse,
	WorkflowMigrationResult,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest, get, requestResponse } from '../utils';

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

export type MigrationReportExport = { blob: Blob; filename: string };

const DEFAULT_EXPORT_FILENAME = 'migration-report.csv';

/** The file name from a `Content-Disposition: attachment; filename="..."` header. */
function attachmentFilename(header: unknown): string | undefined {
	return typeof header === 'string' ? header.match(/filename="([^"]+)"/)?.[1] : undefined;
}

/** The overview as a CSV file, named by the server. */
export async function exportReport(
	context: IRestApiContext,
	query?: BreakingChangeQuery,
): Promise<MigrationReportExport> {
	const response = await requestResponse<Blob>({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: '/breaking-changes/report/export',
		headers: { 'push-ref': context.pushRef },
		data: query,
		responseType: 'blob',
	});
	return {
		blob: response.data,
		filename:
			attachmentFilename(response.headers['content-disposition']) ?? DEFAULT_EXPORT_FILENAME,
	};
}

export async function getReportForRule(
	context: IRestApiContext,
	ruleId: string,
): Promise<BreakingChangeRuleDetailResult> {
	return (await get(context.baseUrl, `/breaking-changes/report/${ruleId}`)).data;
}

export async function getWorkflowOwnerCandidates(
	context: IRestApiContext,
	workflowId: string,
): Promise<MigrationOwnerCandidate[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/breaking-changes/workflows/${workflowId}/owner/candidates`,
	);
}

export async function assignWorkflowOwner(
	context: IRestApiContext,
	workflowId: string,
	userId: string,
): Promise<MigrationWorkflowOwnerResponse> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/breaking-changes/workflows/${workflowId}/owner`,
		{ userId },
	);
}

export async function unassignWorkflowOwner(
	context: IRestApiContext,
	workflowId: string,
): Promise<MigrationWorkflowOwnerResponse> {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`/breaking-changes/workflows/${workflowId}/owner`,
	);
}

export async function migrateWorkflowForRule(
	context: IRestApiContext,
	ruleId: string,
	workflowId: string,
): Promise<WorkflowMigrationResult> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/breaking-changes/report/${ruleId}/workflows/${workflowId}/migrate`,
	);
}

export async function updateFindingStatus(
	context: IRestApiContext,
	ruleId: string,
	workflowId: string,
	status: MigrationFindingTriageStatus,
): Promise<void> {
	await makeRestApiRequest(
		context,
		'PATCH',
		`/breaking-changes/report/${ruleId}/workflows/${workflowId}`,
		{ status },
	);
}

export async function updateFindingStatuses(
	context: IRestApiContext,
	ruleId: string,
	workflowIds: string[],
	status: MigrationFindingTriageStatus,
): Promise<void> {
	await makeRestApiRequest(context, 'PATCH', `/breaking-changes/report/${ruleId}/workflows`, {
		workflowIds,
		status,
	});
}

export async function notifyFindingOwners(
	context: IRestApiContext,
	ruleId: string,
	workflowIds: string[],
): Promise<MigrationNotifyResult> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/breaking-changes/report/${ruleId}/workflows/notify`,
		{ workflowIds },
	);
}
