<script setup lang="ts">
import { computed } from 'vue';
import { FOLDER_LIST_ITEM_ACTIONS } from './constants';
import type { FolderResource } from '../layouts/ResourcesListLayout.vue';
import { type ProjectIcon, ProjectTypes } from '@/types/projects.types';
import { useI18n } from '@/composables/useI18n';

type Props = {
	data: FolderResource;
};

const props = defineProps<Props>();

const i18n = useI18n();

const emit = defineEmits<{
	action: [{ action: string; folderId: string }];
}>();

const actions = computed(() => {
	const items = [
		{
			label: 'Open',
			value: FOLDER_LIST_ITEM_ACTIONS.OPEN,
		},
		{
			label: 'Create Folder',
			value: FOLDER_LIST_ITEM_ACTIONS.CREATE,
			disabled: true,
		},
		{
			label: 'Create Workflow',
			value: FOLDER_LIST_ITEM_ACTIONS.CREATE_WORKFLOW,
			disabled: true,
		},
		{
			label: 'Rename',
			value: FOLDER_LIST_ITEM_ACTIONS.RENAME,
			disabled: true,
		},
		{
			label: 'Move to Folder',
			value: FOLDER_LIST_ITEM_ACTIONS.MOVE,
			disabled: true,
		},
		{
			label: 'Change Owner',
			value: FOLDER_LIST_ITEM_ACTIONS.CHOWN,
			disabled: true,
		},
		{
			label: 'Manage Tags',
			value: FOLDER_LIST_ITEM_ACTIONS.TAGS,
			disabled: true,
		},
		{
			label: 'Delete',
			value: FOLDER_LIST_ITEM_ACTIONS.DELETE,
			disabled: true,
		},
	];
	return items;
});

const breadCrumbsItems = computed(() => {
	if (props.data.parentFolder) {
		return [
			{
				id: props.data.parentFolder.id,
				label: props.data.parentFolder.name,
				href: `/folders/${props.data.parentFolder.id}`,
			},
		];
	}
	return [];
});

const projectIcon = computed<ProjectIcon>(() => {
	const defaultIcon: ProjectIcon = { type: 'icon', value: 'layer-group' };
	if (props.data.homeProject?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	} else if (props.data.homeProject?.type === ProjectTypes.Team) {
		return props.data.homeProject.icon ?? defaultIcon;
	}
	return defaultIcon;
});

const projectName = computed(() => {
	if (props.data.homeProject?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return props.data.homeProject?.name;
});

const onAction = (action: string) => {
	emit('action', { action, folderId: props.data.id });
};
</script>

<template>
	<n8n-card :class="$style.card">
		<template #prepend>
			<n8n-icon :class="$style['folder-icon']" icon="folder" size="large" />
		</template>
		<template #header>
			<n8n-heading tag="h2" bold size="small" data-test-id="folder-card-name">
				{{ data.name }}
			</n8n-heading>
		</template>
		<template #footer>
			<div :class="$style['card-footer']">
				<n8n-text size="small" color="text-light" :class="$style['info-cell']">
					{{ data.workflowCount }} {{ i18n.baseText('generic.workflows') }}
				</n8n-text>
				<n8n-text size="small" color="text-light" :class="$style['info-cell']">
					{{ i18n.baseText('workerList.item.lastUpdated') }}
					<TimeAgo :date="String(data.updatedAt)" />
				</n8n-text>
				<n8n-text size="small" color="text-light" :class="$style['info-cell']">
					{{ i18n.baseText('workflows.item.created') }} <TimeAgo :date="String(data.createdAt)" />
				</n8n-text>
			</div>
		</template>
		<template #append>
			<div :class="$style['card-actions']" @click.stop>
				<n8n-breadcrumbs
					:items="breadCrumbsItems"
					:path-truncated="true"
					:show-border="true"
					:highlight-last-item="false"
					theme="small"
					data-test-id="folder-card-breadcrumbs"
				>
					<template v-if="data.homeProject" #prepend>
						<ProjectIcon :icon="projectIcon" :border-less="true" size="small" />
						<n8n-text size="small">{{ projectName }}</n8n-text>
					</template>
				</n8n-breadcrumbs>
				<n8n-action-toggle
					:actions="actions"
					theme="dark"
					data-test-id="workflow-card-actions"
					@action="onAction"
				/>
			</div>
		</template>
	</n8n-card>
</template>

<style lang="scss" module>
.card {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}
.folder-icon {
	width: var(--spacing-xl);
	height: var(--spacing-xl);
	flex-shrink: 0;
	background-color: var(--color-background-dark);
	color: var(--color-background-light-base);
	border-radius: 50%;
	align-content: center;
	text-align: center;
}

.card-footer {
	display: flex;
}

.info-cell {
	& + & {
		&::before {
			content: '|';
			margin: 0 var(--spacing-4xs);
		}
	}
}

.card-actions {
	display: flex;
	gap: var(--spacing-xs);
}
</style>
