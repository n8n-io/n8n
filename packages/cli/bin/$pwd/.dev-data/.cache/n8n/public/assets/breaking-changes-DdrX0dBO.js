import { Fw as makeRestApiRequest, Iw as requestResponse, Nw as get } from "./app-D5flEmb-.js";
//#region ../@n8n/rest-api-client/src/api/breaking-changes.ts
async function getReport(context, query) {
	return (await get(context.baseUrl, "/breaking-changes/report", query)).data;
}
async function refreshReport(context, query) {
	const refreshUrl = query?.version ? `/breaking-changes/report/refresh?version=${query.version}` : "/breaking-changes/report/refresh";
	return await makeRestApiRequest(context, "POST", refreshUrl);
}
var DEFAULT_EXPORT_FILENAME = "migration-report.csv";
/** The file name from a `Content-Disposition: attachment; filename="..."` header. */
function attachmentFilename(header) {
	return typeof header === "string" ? header.match(/filename="([^"]+)"/)?.[1] : void 0;
}
/** The overview as a CSV file, named by the server. */
async function exportReport(context, query) {
	const response = await requestResponse({
		method: "GET",
		baseURL: context.baseUrl,
		endpoint: "/breaking-changes/report/export",
		headers: { "push-ref": context.pushRef },
		data: query,
		responseType: "blob"
	});
	return {
		blob: response.data,
		filename: attachmentFilename(response.headers["content-disposition"]) ?? DEFAULT_EXPORT_FILENAME
	};
}
async function getReportForRule(context, ruleId) {
	return (await get(context.baseUrl, `/breaking-changes/report/${ruleId}`)).data;
}
async function getWorkflowOwnerCandidates(context, workflowId) {
	return await makeRestApiRequest(context, "GET", `/breaking-changes/workflows/${workflowId}/owner/candidates`);
}
async function assignWorkflowOwner(context, workflowId, userId) {
	return await makeRestApiRequest(context, "PUT", `/breaking-changes/workflows/${workflowId}/owner`, { userId });
}
async function unassignWorkflowOwner(context, workflowId) {
	return await makeRestApiRequest(context, "DELETE", `/breaking-changes/workflows/${workflowId}/owner`);
}
async function migrateWorkflowForRule(context, ruleId, workflowId) {
	return await makeRestApiRequest(context, "POST", `/breaking-changes/report/${ruleId}/workflows/${workflowId}/migrate`);
}
async function updateFindingStatus(context, ruleId, workflowId, status) {
	await makeRestApiRequest(context, "PATCH", `/breaking-changes/report/${ruleId}/workflows/${workflowId}`, { status });
}
async function updateFindingStatuses(context, ruleId, workflowIds, status) {
	await makeRestApiRequest(context, "PATCH", `/breaking-changes/report/${ruleId}/workflows`, {
		workflowIds,
		status
	});
}
async function notifyFindingOwners(context, ruleId, workflowIds) {
	return await makeRestApiRequest(context, "POST", `/breaking-changes/report/${ruleId}/workflows/notify`, { workflowIds });
}
//#endregion
export { getWorkflowOwnerCandidates as a, refreshReport as c, updateFindingStatuses as d, getReportForRule as i, unassignWorkflowOwner as l, exportReport as n, migrateWorkflowForRule as o, getReport as r, notifyFindingOwners as s, assignWorkflowOwner as t, updateFindingStatus as u };
