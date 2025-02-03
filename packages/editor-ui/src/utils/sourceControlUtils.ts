import { h, nextTick } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { type SourceControlledFile, SOURCE_CONTROL_FILE_STATUS } from '@n8n/api-types';
import type { BaseTextKey } from '@/plugins/i18n';
import { VIEWS } from '@/constants';
import { groupBy } from 'lodash-es';
import type { useToast } from '@/composables/useToast';

type SourceControlledFileStatus = SourceControlledFile['status'];

const i18n = useI18n();

export const getStatusText = (status: SourceControlledFileStatus) =>
	i18n.baseText(`settings.sourceControl.status.${status}` as BaseTextKey);

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

const variablesToast = {
	title: i18n.baseText('settings.sourceControl.pull.upToDate.variables.title'),
	message: h(RouterLink, { to: { name: VIEWS.VARIABLES }, query: { incomplete: 'true' } }, () =>
		i18n.baseText('settings.sourceControl.pull.upToDate.variables.description'),
	),
	type: 'info' as const,
	duration: 0,
};

const credentialsToast = {
	title: i18n.baseText('settings.sourceControl.pull.upToDate.credentials.title'),
	message: h(RouterLink, { to: { name: VIEWS.CREDENTIALS, query: { setupNeeded: 'true' } } }, () =>
		i18n.baseText('settings.sourceControl.pull.upToDate.credentials.description'),
	),
	type: 'info' as const,
	duration: 0,
};

const pullMessage = ({
	credential,
	tags,
	variables,
	workflow,
}: Partial<Record<SourceControlledFile['type'], SourceControlledFile[]>>) => {
	const messages: string[] = [];

	if (workflow?.length) {
		messages.push(
			i18n.baseText('generic.workflow', {
				adjustToNumber: workflow.length,
				interpolate: { count: workflow.length },
			}),
		);
	}

	if (credential?.length) {
		messages.push(
			i18n.baseText('generic.credential', {
				adjustToNumber: credential.length,
				interpolate: { count: credential.length },
			}),
		);
	}

	if (variables?.length) {
		messages.push(i18n.baseText('generic.variable_plural'));
	}

	if (tags?.length) {
		messages.push(i18n.baseText('generic.tag_plural'));
	}

	return [
		new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' }).format(messages),
		'were pulled',
	].join(' ');
};

export const notifyUserAboutPullWorkFolderOutcome = async (
	files: SourceControlledFile[],
	toast: ReturnType<typeof useToast>,
) => {
	if (!files?.length) {
		toast.showMessage({
			title: i18n.baseText('settings.sourceControl.pull.upToDate.title'),
			message: i18n.baseText('settings.sourceControl.pull.upToDate.description'),
			type: 'success',
		});
		return;
	}

	const { credential, tags, variables, workflow } = groupBy(files, 'type');

	const toastMessages = [
		...(variables?.length ? [variablesToast] : []),
		...(credential?.length ? [credentialsToast] : []),
		{
			title: i18n.baseText('settings.sourceControl.pull.success.title'),
			message: pullMessage({ credential, tags, variables, workflow }),
			type: 'success' as const,
		},
	];

	for (const message of toastMessages) {
		/**
		 * the toasts stack in a reversed way, resulting in
		 * Success
		 * Credentials
		 * Variables
		 */
		//
		toast.showToast(message);
		await nextTick();
	}
};
