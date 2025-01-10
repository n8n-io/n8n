import { useI18n } from '@/composables/useI18n';
import {
	SOURCE_CONTROL_FILE_STATUS,
	type SourceControlledFileStatus,
} from '@/types/sourceControl.types';
import type { BaseTextKey } from '@/plugins/i18n';

export const getStatusText = (status: SourceControlledFileStatus) =>
	useI18n().baseText(`settings.sourceControl.status.${status}` as BaseTextKey);

export const getStatusTheme = (status: SourceControlledFileStatus) => {
	const statusToBadgeThemeMap: Partial<
		Record<SourceControlledFileStatus, 'success' | 'danger' | 'warning'>
	> = {
		[SOURCE_CONTROL_FILE_STATUS.CREATED]: 'success',
		[SOURCE_CONTROL_FILE_STATUS.DELETED]: 'danger',
		[SOURCE_CONTROL_FILE_STATUS.MODIFIED]: 'warning',
	} as const;
	return statusToBadgeThemeMap[status];
};

type StatusPriority = Partial<Record<SourceControlledFileStatus, number>>;
const pullStatusPriority: StatusPriority = {
	[SOURCE_CONTROL_FILE_STATUS.MODIFIED]: 2,
	[SOURCE_CONTROL_FILE_STATUS.CREATED]: 1,
	[SOURCE_CONTROL_FILE_STATUS.DELETED]: 3,
} as const;

export const getPullPriorityByStatus = (status: SourceControlledFileStatus) =>
	pullStatusPriority[status] ?? 0;

const pushStatusPriority: StatusPriority = {
	[SOURCE_CONTROL_FILE_STATUS.MODIFIED]: 1,
	[SOURCE_CONTROL_FILE_STATUS.RENAMED]: 2,
	[SOURCE_CONTROL_FILE_STATUS.CREATED]: 3,
	[SOURCE_CONTROL_FILE_STATUS.DELETED]: 4,
} as const;

export const getPushPriorityByStatus = (status: SourceControlledFileStatus) =>
	pushStatusPriority[status] ?? 0;
