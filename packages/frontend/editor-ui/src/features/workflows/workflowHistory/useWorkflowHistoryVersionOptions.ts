import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';
import type { WorkflowHistory, WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import { getLastPublishedVersion, getVersionLabel } from './utils';

export type VersionStatus = 'published' | 'latest' | 'default';

export type WorkflowHistoryVersionOption = {
	value: string;
	label: string;
	status: VersionStatus;
	publishInfo?: {
		publishedBy: string | null;
		publishedAt: string;
	};
	createdAt?: string;
};

type UseWorkflowHistoryVersionOptionsParams = {
	availableVersions: ComputedRef<WorkflowHistory[]>;
	activeWorkflowVersionId: Ref<string | undefined>;
	loadedVersions: Ref<Map<string, WorkflowVersion>>;
	selectedVersionIds: ComputedRef<string[]>;
	resolveUserDisplayName: (userId: string | undefined | null) => string | null;
};

export const useWorkflowHistoryVersionOptions = ({
	availableVersions,
	activeWorkflowVersionId,
	loadedVersions,
	selectedVersionIds,
	resolveUserDisplayName,
}: UseWorkflowHistoryVersionOptionsParams) => {
	const getAvailableVersionById = (versionId: string) =>
		availableVersions.value.find((version) => version.versionId === versionId);

	const getVersionLabelById = (versionId: string): string => {
		const historyVersion = getAvailableVersionById(versionId);
		const loadedVersion = loadedVersions.value.get(versionId);
		const workflowHistory = historyVersion ?? loadedVersion ?? { versionId };
		return getVersionLabel({
			workflowHistory,
			currentVersionId: activeWorkflowVersionId.value,
		});
	};

	const getVersionStatusById = (versionId: string): VersionStatus => {
		if (versionId === activeWorkflowVersionId.value) {
			return 'latest';
		}

		const historyVersion = getAvailableVersionById(versionId);
		if (historyVersion && getLastPublishedVersion(historyVersion.workflowPublishHistory)) {
			return 'published';
		}

		return 'default';
	};

	const getVersionPublishInfoById = (
		versionId: string,
	): WorkflowHistoryVersionOption['publishInfo'] => {
		const historyVersion = getAvailableVersionById(versionId);
		if (!historyVersion) {
			return undefined;
		}

		const publishInfo = getLastPublishedVersion(historyVersion.workflowPublishHistory);
		if (!publishInfo) {
			return undefined;
		}

		const publishedBy = resolveUserDisplayName(publishInfo.userId);
		return {
			publishedBy,
			publishedAt: publishInfo.createdAt,
		};
	};

	const getVersionCreatedAtById = (versionId: string): string | undefined => {
		const historyVersion = getAvailableVersionById(versionId);
		return historyVersion?.createdAt;
	};

	const versionOptions = computed<WorkflowHistoryVersionOption[]>(() => {
		const options = new Map(
			availableVersions.value.map((version) => [
				version.versionId,
				getVersionLabelById(version.versionId),
			]),
		);

		for (const versionId of selectedVersionIds.value) {
			if (versionId && !options.has(versionId)) {
				options.set(versionId, getVersionLabelById(versionId));
			}
		}

		return Array.from(options.entries()).map(([value, label]) => ({
			value,
			label,
			status: getVersionStatusById(value),
			publishInfo: getVersionPublishInfoById(value),
			createdAt: getVersionCreatedAtById(value),
		}));
	});

	return {
		getVersionLabelById,
		versionOptions,
	};
};
