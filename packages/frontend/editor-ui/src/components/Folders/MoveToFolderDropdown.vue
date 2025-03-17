<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { FolderListItem } from '@/Interface';
import { useFoldersStore } from '@/stores/folders.store';
import { N8nSelect } from '@n8n/design-system';
import { ref } from 'vue';

/**
 * This component is used to select a folder to move a resource (folder or workflow) to.
 * Based on the provided resource type, it fetches the available folders and displays them in a dropdown.
 * For folders, it filters out current folder parent and all off it's children (done in the back-end)
 * For workflows, it only filters out the current workflows's folder.
 */

type Props = {
	currentProjectId: string;
	currentFolderId?: string;
	parentFolderId?: string;
};

const props = withDefaults(defineProps<Props>(), {
	currentFolderId: '',
	parentFolderId: '',
});

const emit = defineEmits<{
	'folder:selected': [value: { id: string; name: string }];
}>();

const i18n = useI18n();

const foldersStore = useFoldersStore();

const moveFolderDropdown = ref<InstanceType<typeof N8nSelect>>();
const selectedFolderId = ref<string | null>(null);
const availableFolders = ref<FolderListItem[]>([]);
const loading = ref(false);

const fetchAvailableFolders = async (query?: string) => {
	if (!query) {
		availableFolders.value = [];
		return;
	}
	loading.value = true;
	const folders = await foldersStore.fetchFoldersAvailableForMove(
		props.currentProjectId,
		props.currentFolderId,
		{ name: query ?? undefined },
	);
	if (!props.parentFolderId) {
		availableFolders.value = folders;
	} else {
		availableFolders.value = folders.filter((folder) => folder.id !== props.parentFolderId);
	}
	loading.value = false;
};

const onFolderSelected = (folderId: string) => {
	const selectedFolder = availableFolders.value.find((folder) => folder.id === folderId);
	if (!selectedFolder) {
		return;
	}
	emit('folder:selected', { id: folderId, name: selectedFolder.name });
};
</script>

<template>
	<div :class="$style['move-folder-dropdown']" data-test-id="move-to-folder-dropdown">
		<N8nSelect
			ref="moveFolderDropdown"
			v-model="selectedFolderId"
			:filterable="true"
			:remote="true"
			:remote-method="fetchAvailableFolders"
			:loading="loading"
			:placeholder="i18n.baseText('folders.move.modal.select.placeholder')"
			option-label="name"
			option-value="id"
			@update:model-value="onFolderSelected"
		>
			<N8nOption
				v-for="folder in availableFolders"
				:key="folder.id"
				:value="folder.id"
				:label="folder.name"
			>
				<div :class="$style['folder-select-item']">
					<n8n-icon :class="$style['folder-icon']" icon="folder" />
					<span :class="$style['folder-name']"> {{ folder.name }}</span>
				</div>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style module lang="scss">
.move-folder-dropdown {
	display: flex;
}

.folder-select-item {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
	max-width: 90%;
	overflow: hidden;
	white-space: nowrap;

	.folder-name {
		text-overflow: ellipsis;
		overflow: hidden;
	}
}
</style>
