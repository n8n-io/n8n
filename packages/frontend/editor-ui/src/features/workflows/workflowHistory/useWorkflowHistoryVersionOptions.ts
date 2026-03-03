import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';
import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';
import { getLastPublishedVersion, getVersionLabel } from './utils';
import type { WorkflowHistoryVersionStatus } from './types';

export type WorkflowHistoryVersionOption = {
	value: string;
	label: string;
	status: WorkflowHistoryVersionStatus;
	publishInfo?: {
		publishedBy: string | null;
		publishedAt: string;
	};
	createdAt?: string;
};

type UseWorkflowHistoryVersionOptionsParams = {
	availableVersions: ComputedRef<WorkflowHistory[]>;
	currentWorkflowVersionId: Ref<string | undefined>;
	activeWorkflowVersionId: Ref<string | undefined>;
	selectedVersionIds: ComputedRef<string[]>;
	resolveUserDisplayName: (userId: string | undefined | null) => string | null;
};

export const useWorkflowHistoryVersionOptions = ({
	availableVersions,
	currentWorkflowVersionId,
	activeWorkflowVersionId,
	selectedVersionIds,
	resolveUserDisplayName,
}: UseWorkflowHistoryVersionOptionsParams) => {
	const getVersionById = (versionId: string) =>
		availableVersions.value.find((version) => version.versionId === versionId);

	const getVersionLabelById = (versionId: string): string => {
		const workflowHistory = getVersionById(versionId) ?? { versionId, name: null };
		return getVersionLabel({
			workflowHistory,
			currentVersionId: currentWorkflowVersionId.value,
		});
	};

	const getVersionStatusById = (versionId: string): WorkflowHistoryVersionStatus => {
		if (versionId === activeWorkflowVersionId.value) {
			return 'active';
		}

		const isLatest = versionId === currentWorkflowVersionId.value;
		return isLatest ? 'latest' : 'default';
	};

	const getVersionPublishInfoById = (
		versionId: string,
	): WorkflowHistoryVersionOption['publishInfo'] => {
		const historyVersion = getVersionById(versionId);
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
		const historyVersion = getVersionById(versionId);
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
