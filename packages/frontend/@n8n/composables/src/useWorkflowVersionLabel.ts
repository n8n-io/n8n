import { useI18n } from '@n8n/i18n';

export const generateVersionLabelFromId = (versionId: string) =>
	`Version ${versionId.substring(0, 8)}`;

export const getVersionLabel = ({
	workflowHistory,
	currentVersionId,
}: {
	workflowHistory: { versionId: string; name?: string | null };
	currentVersionId?: string;
}) => {
	if (workflowHistory.name) return workflowHistory.name;
	return workflowHistory.versionId === currentVersionId
		? useI18n().baseText('workflowHistory.item.currentChanges')
		: generateVersionLabelFromId(workflowHistory.versionId);
};
