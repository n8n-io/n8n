import { useI18n } from '@/composables/useI18n';
import { type SourceControlledFile, SOURCE_CONTROL_FILE_STATUS } from '@n8n/api-types';
import type { BaseTextKey } from '@/plugins/i18n';

type SourceControlledFileStatus = SourceControlledFile['status'];

export const getStatusText = (status: SourceControlledFileStatus) =>
	useI18n().baseText(`settings.sourceControl.status.${status}` as BaseTextKey);

export const getStatusTheme = (status: SourceControlledFileStatus) => {
	const statusToBadgeThemeMap: Partial<
		Record<SourceControlledFileStatus, 'success' | 'danger' | 'warning'>
	> = {
		[SOURCE_CONTROL_FILE_STATUS.created]: 'success',
		[SOURCE_CONTROL_FILE_STATUS.deleted]: 'danger',
		[SOURCE_CONTROL_FILE_STATUS.modified]: 'warning',
	} as const;
	return statusToBadgeThemeMap[status];
};

type StatusPriority = Partial<Record<SourceControlledFileStatus, number>>;
const pullStatusPriority: StatusPriority = {
	[SOURCE_CONTROL_FILE_STATUS.modified]: 2,
	[SOURCE_CONTROL_FILE_STATUS.created]: 1,
	[SOURCE_CONTROL_FILE_STATUS.deleted]: 3,
} as const;

export const getPullPriorityByStatus = (status: SourceControlledFileStatus) =>
	pullStatusPriority[status] ?? 0;

const pushStatusPriority: StatusPriority = {
	[SOURCE_CONTROL_FILE_STATUS.modified]: 1,
	[SOURCE_CONTROL_FILE_STATUS.renamed]: 2,
	[SOURCE_CONTROL_FILE_STATUS.created]: 3,
	[SOURCE_CONTROL_FILE_STATUS.deleted]: 4,
} as const;

export const getPushPriorityByStatus = (status: SourceControlledFileStatus) =>
	pushStatusPriority[status] ?? 0;
