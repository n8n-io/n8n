import { jN as useI18n, tA as EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from "./app-D5flEmb-.js";
//#region src/features/agents/utils/workflowToolTriggers.ts
/** Locale key of each supported trigger's display name, keyed by node type so a rename is a one-key change. */
var TRIGGER_LABEL_KEYS = { [EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE]: "nodeCreator.aiPanel.workflowTriggerDisplayName" };
/** Display name of the trigger a workflow tool has to start with, for the `{trigger}` placeholder. */
function workflowToolTriggerLabel() {
	return useI18n().baseText(TRIGGER_LABEL_KEYS[EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE]);
}
//#endregion
//#region src/features/agents/utils/validationIssues.ts
/** A policy denies the node type this capability runs as, so it cannot publish or preview. */
function isRestrictedIssue(issue) {
	return issue.code === "restricted_node_type";
}
/** The entry itself is allowed, and only the inline agent it embeds holds a denied type. */
function isRestrictedByInlineTool(issue) {
	return isRestrictedIssue(issue) && issue.reason === "restricted_by_inline_tool";
}
/**
* A warning blocks publishing but not the draft preview: the workflow tool is
* compatible, its workflow just has no published version yet.
*/
function isWarningIssue(issue) {
	return issue.code === "incompatible_reference" && issue.reason === "not_published";
}
/** Warning-only issues are resolved by the publish flow itself, so only the rest block it. */
function hasBlockingIssues(issues) {
	return issues.some((issue) => !isWarningIssue(issue));
}
/**
* The unpublished workflow tools behind a config validation, for the modal the
* builder shows instead of a failing publish request. The issue's
* `capability.id` is the workflow's display name; `capability.index` locates
* the tool config for its stable workflow id.
*/
function unpublishedWorkflowTools(issues, tools) {
	return issues.filter((issue) => isWarningIssue(issue)).map((issue) => {
		const tool = issue.capability.index === void 0 ? void 0 : tools[issue.capability.index];
		const workflowTool = tool?.type === "workflow" ? tool : void 0;
		return {
			name: workflowTool?.workflow ?? issue.capability.id ?? "",
			workflowId: workflowTool?.workflowId
		};
	}).filter((workflow) => workflow.name !== "");
}
//#endregion
export { unpublishedWorkflowTools as a, isWarningIssue as i, isRestrictedByInlineTool as n, workflowToolTriggerLabel as o, isRestrictedIssue as r, hasBlockingIssues as t };
