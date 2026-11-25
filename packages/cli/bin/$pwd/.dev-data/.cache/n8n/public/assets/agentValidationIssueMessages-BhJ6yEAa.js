import { o as workflowToolTriggerLabel } from "./validationIssues-CnPTm-2x.js";
//#region src/features/agents/utils/agentValidationIssueMessages.ts
var GENERIC_ISSUE_KEYS = {
	missing_required: "agents.builder.validation.issue.missingRequired",
	invalid_value: "agents.builder.validation.issue.invalidValue",
	missing_credential: "agents.builder.validation.issue.missingCredential",
	invalid_credential: "agents.builder.validation.issue.invalidCredential",
	incompatible_credential: "agents.builder.validation.issue.incompatibleCredential",
	missing_reference: "agents.builder.validation.issue.missingReference",
	incompatible_reference: "agents.builder.validation.issue.incompatibleReference",
	restricted_node_type: "agents.builder.validation.issue.restrictedNodeType"
};
var SPECIFIC_ISSUE_KEYS = {
	"subAgent.missing_reference": "agents.builder.validation.issue.subAgent.missingReference",
	"subAgent.incompatible_reference": "agents.builder.validation.issue.subAgent.incompatibleReference",
	"skill.missing_reference": "agents.builder.validation.issue.skill.missingReference",
	"task.invalid_value": "agents.builder.validation.issue.task.invalidValue",
	"tool.workflow.missing_reference": "agents.builder.validation.issue.tool.workflow.missingReference",
	"tool.workflow.incompatible_reference": "agents.builder.validation.issue.tool.workflow.incompatibleReference",
	"tool.custom.missing_reference": "agents.builder.validation.issue.tool.custom.missingReference",
	"tool.node.missing_reference": "agents.builder.validation.issue.tool.node.missingReference",
	"mcpServer.incompatible_credential": "agents.builder.validation.issue.mcpServer.incompatibleCredential"
};
var REASON_SPECIFIC_KEYS = {
	incompatible_nodes: "agents.builder.validation.issue.tool.workflow.incompatibleNodes",
	no_supported_trigger: "agents.builder.validation.issue.tool.workflow.noSupportedTrigger",
	not_published: "agents.builder.validation.issue.tool.workflow.notPublished",
	restricted_by_inline_tool: "agents.builder.validation.issue.restrictedByInlineTool"
};
function resolveAgentValidationIssueMessageKey(issue) {
	const { kind, toolType } = issue.capability;
	return (issue.code === "invalid_value" && issue.path.endsWith(".node.nodeParameters.url") ? "agents.builder.validation.issue.httpRequestUrlFromAi" : void 0) ?? (issue.reason ? REASON_SPECIFIC_KEYS[issue.reason] : void 0) ?? (kind === "tool" && toolType ? SPECIFIC_ISSUE_KEYS[`tool.${toolType}.${issue.code}`] : void 0) ?? SPECIFIC_ISSUE_KEYS[`${kind}.${issue.code}`] ?? GENERIC_ISSUE_KEYS[issue.code];
}
function getAgentValidationIssueInterpolation(issue) {
	return {
		id: issue.capability.id ?? "",
		trigger: workflowToolTriggerLabel()
	};
}
//#endregion
export { resolveAgentValidationIssueMessageKey as n, getAgentValidationIssueInterpolation as t };
