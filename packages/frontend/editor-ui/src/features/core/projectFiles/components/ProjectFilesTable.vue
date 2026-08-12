<script lang="ts" setup>
import type { ProjectFileResponse } from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nDataTableServer,
	N8nIcon,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IUser, TableHeader, TableOptions, UserAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';

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
		width: 48,
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

/**
 * `null` means the original uploader is no longer resolvable — a deleted user.
 * Shown as "Unknown" rather than blank so the column is never silently empty.
 */
const actorName = (file: ProjectFileResponse) => {
	const actor = file.updatedBy ?? file.createdBy;
	if (!actor) return i18n.baseText('projectFiles.table.unknownUser');

	const name = [actor.firstName, actor.lastName].filter(Boolean).join(' ');

	return name || actor.email;
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
			<N8nText color="text-base" size="small">{{ actorName(item) }}</N8nText>
		</template>

		<template #[`item.updatedAt`]="{ item }">
			<N8nText color="text-base" size="small">
				<TimeAgo :date="item.updatedAt" />
			</N8nText>
		</template>

		<template #[`item.actions`]="{ item }">
			<N8nActionToggle
				placement="bottom-end"
				:actions="actions"
				theme="dark"
				:data-test-id="`project-file-actions-${item.id}`"
				@action="onAction($event, item)"
			/>
		</template>
	</N8nDataTableServer>
</template>

<style lang="scss" module>
.nameCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.name {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
