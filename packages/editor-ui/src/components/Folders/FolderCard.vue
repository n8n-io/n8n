<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { Folder } from '@/types/folders.types';
import { computed } from 'vue';
import { FOLDER_LIST_ITEM_ACTIONS } from './constants';

type Props = {
	data: Folder;
};

const locale = useI18n();

const props = defineProps<Props>();

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
					{{ data.workflowCount }} Workflows
				</n8n-text>
				<n8n-text size="small" color="text-light" :class="$style['info-cell']">
					Last updated <TimeAgo :date="String(data.updatedAt)" />
				</n8n-text>
				<n8n-text size="small" color="text-light" :class="$style['info-cell']">
					Created <TimeAgo :date="String(data.createdAt)" />
				</n8n-text>
			</div>
		</template>
		<template #append>
			<n8n-action-toggle
				:actions="actions"
				theme="dark"
				data-test-id="workflow-card-actions"
				@action="onAction"
			/>
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
</style>
