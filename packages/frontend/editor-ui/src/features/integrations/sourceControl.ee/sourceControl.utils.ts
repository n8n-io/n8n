import { h, nextTick } from 'vue';
import type { Router } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { type SourceControlledFile, SOURCE_CONTROL_FILE_STATUS } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import groupBy from 'lodash/groupBy';
import dateformat from 'dateformat';
import type { useToast } from '@/app/composables/useToast';
import { telemetry } from '@/app/plugins/telemetry';
import type { SourceControlTreeRow } from './sourceControl.types';

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

const createVariablesToast = (router: Router) => {
	const route = { name: VIEWS.HOME_VARIABLES, query: { incomplete: 'true' } };
	const { href } = router.resolve(route);

	return {
		title: i18n.baseText('settings.sourceControl.pull.upToDate.variables.title'),
		message: h(
			'a',
			{
				href,
				onClick: (e: MouseEvent) => {
					e.preventDefault();
					telemetry.track('User clicked review variables');
					void router.push(route);
				},
			},
			i18n.baseText('settings.sourceControl.pull.upToDate.variables.description'),
		),
		type: 'info' as const,
		duration: 0,
	};
};

const createCredentialsToast = (router: Router) => {
	const route = { name: VIEWS.CREDENTIALS, query: { setupNeeded: 'true' } };
	const { href } = router.resolve(route);

	return {
		title: i18n.baseText('settings.sourceControl.pull.upToDate.credentials.title'),
		message: h(
			'a',
			{
				href,
				onClick: (e: MouseEvent) => {
					e.preventDefault();
					telemetry.track('User clicked review credentials');
					void router.push(route);
				},
			},
			i18n.baseText('settings.sourceControl.pull.upToDate.credentials.description'),
		),
		type: 'info' as const,
		duration: 0,
	};
};

const pullMessage = ({
	credential,
	tags,
	variables,
	datatable,
	workflow,
	folders,
	project,
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

	if (datatable?.length) {
		messages.push(
			i18n.baseText('generic.datatable', {
				adjustToNumber: datatable.length,
				interpolate: { count: datatable.length },
			}),
		);
	}

	if (tags?.length) {
		messages.push(i18n.baseText('generic.tag_plural'));
	}

	if (folders?.length) {
		messages.push(i18n.baseText('generic.folders_plural'));
	}

	if (project?.length) {
		messages.push(i18n.baseText('generic.projects'));
	}

	const totalCount =
		(workflow?.length ?? 0) +
		(credential?.length ?? 0) +
		(variables?.length ?? 0) +
		(datatable?.length ?? 0) +
		(tags?.length ?? 0) +
		(folders?.length ?? 0) +
		(project?.length ?? 0);

	// Plural-only resources (variables, tags, folders, projects) always use plural labels.
	// Force plural verb when any of these are present, even if totalCount is 1.
	const hasPluralOnlyResources = !!(
		variables?.length ||
		tags?.length ||
		folders?.length ||
		project?.length
	);
	const verbCount = hasPluralOnlyResources ? Math.max(totalCount, 2) : totalCount;

	return [
		new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' }).format(messages),
		i18n.baseText('settings.sourceControl.pull.success.description', {
			adjustToNumber: verbCount,
		}),
	].join(' ');
};

export function buildWorkflowTreeRows<T extends SourceControlledFile>(
	workflows: T[],
): Array<SourceControlTreeRow<T>> {
	const rows: Array<SourceControlTreeRow<T>> = [];
	const seenFolders = new Set<string>();

	for (const workflow of workflows) {
		const path = workflow.folderPath ?? [];
		let pathKey = '';

		for (const [index, segment] of path.entries()) {
			pathKey = pathKey ? `${pathKey}/${segment}` : segment;
			if (seenFolders.has(pathKey)) {
				continue;
			}

			rows.push({
				id: `folder:${pathKey}`,
				type: 'folder',
				name: segment,
				depth: index,
			});
			seenFolders.add(pathKey);
		}

		rows.push({
			id: `file:${workflow.id}`,
			type: 'file',
			file: workflow,
			depth: path.length,
		});
	}

	return rows;
}

export const buildFolderFilterOptions = (workflows: SourceControlledFile[]) => {
	const folderPathSet = new Set<string>();

	for (const workflow of workflows) {
		const pathSegments = workflow.folderPath ?? [];
		let path = '';

		for (const segment of pathSegments) {
			path = path ? `${path}/${segment}` : segment;
			folderPathSet.add(path);
		}
	}

	return Array.from(folderPathSet)
		.sort((a, b) => {
			const depthDiff = a.split('/').length - b.split('/').length;
			if (depthDiff !== 0) {
				return depthDiff;
			}
			return a.localeCompare(b);
		})
		.map((path) => ({
			label: path.replaceAll('/', ' / '),
			value: path,
		}));
};

export const formatSourceControlUpdatedAt = (updatedAt: string | undefined) => {
	const currentYear = new Date().getFullYear().toString();

	return i18n.baseText('settings.sourceControl.lastUpdated', {
		interpolate: {
			date: dateformat(updatedAt, `d mmm${updatedAt?.startsWith(currentYear) ? '' : ', yyyy'}`),
			time: dateformat(updatedAt, 'HH:MM'),
		},
	});
};

export const notifyUserAboutPullWorkFolderOutcome = async (
	files: SourceControlledFile[],
	toast: ReturnType<typeof useToast>,
	router: Router,
) => {
	if (!files?.length) {
		toast.showMessage({
			title: i18n.baseText('settings.sourceControl.pull.upToDate.title'),
			message: i18n.baseText('settings.sourceControl.pull.upToDate.description'),
			type: 'success',
		});
		return;
	}

	const { credential, tags, variables, datatable, workflow, folders, project } = groupBy(
		files,
		'type',
	);

	const toastMessages = [
		...(variables?.length ? [createVariablesToast(router)] : []),
		...(credential?.length ? [createCredentialsToast(router)] : []),
		{
			title: i18n.baseText('settings.sourceControl.pull.success.title'),
			message: pullMessage({ credential, tags, variables, datatable, workflow, folders, project }),
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
		toast.showToast(message);
		await nextTick();
	}
};
