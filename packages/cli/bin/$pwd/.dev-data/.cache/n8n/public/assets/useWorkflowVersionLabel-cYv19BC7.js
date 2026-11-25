import { jN as useI18n } from "./app-D5flEmb-.js";
//#region ../@n8n/composables/src/useWorkflowVersionLabel.ts
var generateVersionLabelFromId = (versionId) => {
	return `Version ${versionId.substring(0, 8)}`;
};
var getVersionLabel = ({ workflowHistory, currentVersionId }) => {
	const i18n = useI18n();
	if (workflowHistory.name) return workflowHistory.name;
	return workflowHistory.versionId === currentVersionId ? i18n.baseText("workflowHistory.item.currentChanges") : generateVersionLabelFromId(workflowHistory.versionId);
};
//#endregion
export { getVersionLabel as n, generateVersionLabelFromId as t };
