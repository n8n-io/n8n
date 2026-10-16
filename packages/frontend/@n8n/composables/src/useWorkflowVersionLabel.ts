import { useI18n } from '@n8n/i18n';

export const generateVersionLabelFromId = (versionId: string) => {
	return `Version ${versionId.substring(0, 8)}`;
};

export const getVersionLabel = ({
	workflowHistory,
	currentVersionId,
}: {
	workflowHistory: { versionId: string; name?: string | null };
	currentVersionId?: string;
}) => {
	const i18n = useI18n();
	if (workflowHistory.name) {
		return workflowHistory.name;
	}

	const isCurrentVersion = workflowHistory.versionId === currentVersionId;
	return isCurrentVersion
		? i18n.baseText('workflowHistory.item.currentChanges')
		: generateVersionLabelFromId(workflowHistory.versionId);
};
