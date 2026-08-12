<script lang="ts" setup>
import type { ProjectFileResponse } from '@n8n/api-types';
import { isProjectFilePreviewable } from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nDataTableServer,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IUser, TableHeader, TableOptions, UserAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { VIEWS } from '@/app/constants';

import { PROJECT_FILE_ACTIONS } from '@/features/core/projectFiles/constants';
import { fileIcon, formatBytes } from '@/features/core/projectFiles/utils';

type Props = {
	files: ProjectFileResponse[];
	totalCount: number;
	loading: boolean;
	page: number;
	itemsPerPage: number;
	pageSizes: number[];
	canUpdate: boolean;
	canDelete: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	'update:options': [payload: TableOptions];
	action: [payload: { action: string; file: ProjectFileResponse }];
	preview: [file: ProjectFileResponse];
}>();

const i18n = useI18n();

const headers = computed<Array<TableHeader<ProjectFileResponse>>>(() => [
	{
		title: i18n.baseText('projectFiles.table.header.name'),
		key: 'name',
		disableSort: true,
	},
	{
		title: i18n.baseText('projectFiles.table.header.size'),
		key: 'fileSizeBytes',
		disableSort: true,
		width: 120,
	},
	{
		title: i18n.baseText('projectFiles.table.header.uploadedBy'),
		key: 'updatedBy',
		disableSort: true,
		width: 200,
	},
	{
		title: i18n.baseText('projectFiles.table.header.updatedAt'),
		key: 'updatedAt',
		disableSort: true,
		width: 180,
	},
	{
		title: '',
		key: 'actions',
		disableSort: true,
		width: 88,
		align: 'end',
		// Not a field on the row: the header union requires an accessor for a key
		// that isn't part of the item type.
		value() {
			return;
		},
	},
]);

// `UserAction`'s type parameter only types its unused `guard` callback, so it is
// pinned to the base type rather than threading `ProjectFileResponse` through.
const actions = computed<Array<UserAction<IUser>>>(() => {
	const available: Array<UserAction<IUser>> = [
		{
			label: i18n.baseText('projectFiles.action.download'),
			value: PROJECT_FILE_ACTIONS.DOWNLOAD,
			disabled: false,
		},
	];

	if (props.canUpdate) {
		available.push({
			label: i18n.baseText('projectFiles.action.rename'),
			value: PROJECT_FILE_ACTIONS.RENAME,
			disabled: false,
		});
	}

	if (props.canDelete) {
		available.push({
			label: i18n.baseText('projectFiles.action.delete'),
			value: PROJECT_FILE_ACTIONS.DELETE,
			disabled: false,
		});
	}

	return available;
});

/** Whoever last touched the file, falling back to whoever created it. */
const fileActor = (file: ProjectFileResponse) => file.updatedBy ?? file.createdBy;

/**
 * `null` means the actor is no longer resolvable — a deleted user or workflow.
 * Shown as "Unknown" rather than blank so the column is never silently empty.
 */
const actorName = (file: ProjectFileResponse) => {
	const actor = fileActor(file);
	if (!actor) return i18n.baseText('projectFiles.table.unknownUser');

	if (actor.type === 'workflow') return actor.name;

	const name = [actor.firstName, actor.lastName].filter(Boolean).join(' ');

	return name || actor.email;
};

/** Files written by the node link back to the workflow that wrote them. */
const workflowRoute = (file: ProjectFileResponse) => {
	const actor = fileActor(file);
	if (actor?.type !== 'workflow') return undefined;

	return { name: VIEWS.WORKFLOW, params: { workflowId: actor.id } };
};

const onAction = (action: string, file: ProjectFileResponse) => {
	emit('action', { action, file });
};
</script>

<template>
	<N8nDataTableServer
		:headers="headers"
		:items="props.files"
		:items-length="props.totalCount"
		:loading="props.loading"
		:page="props.page"
		:items-per-page="props.itemsPerPage"
		:page-sizes="props.pageSizes"
		data-test-id="project-files-table"
		@update:options="emit('update:options', $event)"
	>
		<template #[`item.name`]="{ item }">
			<div :class="$style.nameCell">
				<N8nIcon :icon="fileIcon(item.mimeType)" color="text-light" />
				<N8nTooltip :content="item.name" placement="top">
					<N8nText :class="$style.name" bold>{{ item.name }}</N8nText>
				</N8nTooltip>
			</div>
		</template>

		<template #[`item.fileSizeBytes`]="{ item }">
			<N8nText color="text-base" size="small">{{ formatBytes(item.fileSizeBytes) }}</N8nText>
		</template>

		<template #[`item.updatedBy`]="{ item }">
			<N8nTooltip
				v-if="workflowRoute(item)"
				:content="i18n.baseText('projectFiles.table.addedByWorkflow')"
				placement="top"
			>
				<RouterLink :to="workflowRoute(item)!" :class="$style.workflowActor">
					<N8nIcon icon="workflow" color="text-light" size="small" />
					<N8nText color="text-base" size="small">{{ actorName(item) }}</N8nText>
				</RouterLink>
			</N8nTooltip>
			<N8nText v-else color="text-base" size="small">{{ actorName(item) }}</N8nText>
		</template>

		<template #[`item.updatedAt`]="{ item }">
			<N8nText color="text-base" size="small">
				<TimeAgo :date="item.updatedAt" />
			</N8nText>
		</template>

		<template #[`item.actions`]="{ item }">
			<div :class="$style.actionsCell">
				<N8nTooltip
					v-if="isProjectFilePreviewable(item.mimeType)"
					:content="i18n.baseText('projectFiles.action.preview')"
					placement="top"
				>
					<N8nIconButton
						icon="eye"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('projectFiles.action.preview')"
						:data-test-id="`project-file-preview-${item.id}`"
						@click="emit('preview', item)"
					/>
				</N8nTooltip>
				<N8nActionToggle
					placement="bottom-end"
					:actions="actions"
					theme="dark"
					:data-test-id="`project-file-actions-${item.id}`"
					@action="onAction($event, item)"
				/>
			</div>
		</template>
	</N8nDataTableServer>
</template>

<style lang="scss" module>
.actionsCell {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.nameCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.workflowActor {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.name {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
