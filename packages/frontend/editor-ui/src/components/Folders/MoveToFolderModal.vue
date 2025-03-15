<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { MOVE_FOLDER_MODAL_KEY } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import { useUIStore } from '@/stores/ui.store';
import { type EventBus } from '@n8n/utils/event-bus';
import { computed, ref } from 'vue';

/**
 * This modal is used to move a resource (folder or workflow) to a different folder.
 */

type Props = {
	modalName: string;
	data: {
		resourceType: 'folder' | 'workflow';
		resource: {
			id: string;
			name: string;
			parentFolderId?: string;
		};
		workflowListEventBus: EventBus;
	};
};

const props = defineProps<Props>();

const i18n = useI18n();

const projectsStore = useProjectsStore();
const uiStore = useUIStore();

const selectedFolder = ref<{ id: string; name: string } | null>(null);

const title = computed(() => {
	return i18n.baseText('folders.move.modal.title', {
		interpolate: { folderName: props.data.resource.name },
	});
});

const currentFolder = computed(() => {
	if (props.data.resourceType === 'workflow') {
		return;
	}
	return {
		id: props.data.resource.id,
		name: props.data.resource.name,
	};
});

const onFolderSelected = (payload: { id: string; name: string }) => {
	selectedFolder.value = payload;
};

const onSubmit = () => {
	if (props.data.resourceType === 'folder') {
		props.data.workflowListEventBus.emit('folder-moved', {
			newParent: selectedFolder.value,
			folder: { id: props.data.resource.id, name: props.data.resource.name },
		});
	} else {
		props.data.workflowListEventBus.emit('workflow-moved', {
			newParent: selectedFolder.value,
			workflow: {
				id: props.data.resource.id,
				name: props.data.resource.name,
				oldParentId: props.data.resource.parentFolderId,
			},
		});
	}
	uiStore.closeModal(MOVE_FOLDER_MODAL_KEY);
};
</script>

<template>
	<Modal :name="modalName" :title="title" width="500" :class="$style.container">
		<template #content>
			<MoveToFolderDropdown
				v-if="projectsStore.currentProject"
				:current-folder-id="currentFolder?.id"
				:current-project-id="projectsStore.currentProject?.id"
				:parent-folder-id="props.data.resource.parentFolderId"
				:exclude-only-parent="props.data.resourceType === 'workflow'"
				@folder:selected="onFolderSelected"
			/>
			<p
				v-if="props.data.resourceType === 'folder'"
				:class="$style.description"
				data-test-id="move-folder-description"
			>
				{{ i18n.baseText('folders.move.modal.description') }}
			</p>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					float="right"
					data-test-id="cancel-move-folder-button"
					@click="close"
				/>
				<n8n-button
					:disabled="!selectedFolder"
					:label="i18n.baseText('folders.move.modal.confirm')"
					float="right"
					data-test-id="confirm-move-folder-button"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	h1 {
		max-width: 90%;
	}
}

.description {
	font-size: var(--font-size-s);
	margin: var(--spacing-s) 0;
}

.footer {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}
</style>
