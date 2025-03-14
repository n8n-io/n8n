<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { MOVE_FOLDER_MODAL_KEY } from '@/constants';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useUIStore } from '@/stores/ui.store';
import type { EventBus } from '@n8n/utils/event-bus';
import { computed, ref } from 'vue';

type Props = {
	modalName: string;
	activeId: string;
	data: {
		workflowListEventBus: EventBus;
	};
};

const props = defineProps<Props>();

const i18n = useI18n();

const foldersStore = useFoldersStore();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

const selectedFolder = ref<{ id: string; name: string } | null>(null);

const currentFolder = computed(() => {
	return foldersStore.breadcrumbsCache[props.activeId];
});

const title = computed(() => {
	const folderName = currentFolder.value?.name ?? '';
	return i18n.baseText('folders.move.modal.title', { interpolate: { folderName } });
});

const onFolderSelected = (payload: { id: string; name: string }) => {
	selectedFolder.value = payload;
};

const onSubmit = () => {
	props.data.workflowListEventBus.emit('folder-moved', {
		newParent: selectedFolder.value,
		folder: { id: currentFolder.value.id, name: currentFolder.value.name },
	});
	uiStore.closeModal(MOVE_FOLDER_MODAL_KEY);
};
</script>

<template>
	<Modal :name="modalName" :title="title" width="500" :class="$style.container">
		<template #content>
			<MoveFolderDropdown
				v-if="projectsStore.currentProject"
				:current-folder="currentFolder"
				:current-project-id="projectsStore.currentProject?.id"
				@folder:selected="onFolderSelected"
			/>
			<p :class="$style.description">{{ i18n.baseText('folders.move.modal.description') }}</p>
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
