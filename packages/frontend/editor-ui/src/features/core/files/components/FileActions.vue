<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import {
	FILE_CARD_ACTIONS,
	RENAME_FILE_MODAL_KEY,
	REPLACE_FILE_MODAL_KEY,
} from '@/features/core/files/constants';

import { useFilesStore } from '@/features/core/files/files.store';
import type { ProjectFile } from '@/features/core/files/files.types';
import type { IUser, UserAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { escapeHtml } from '@/app/utils/htmlUtils';

import { N8nActionToggle } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useDependencies } from '@/app/composables/useDependencies';
import RenameFileModal from './RenameFileModal.vue';
import ReplaceFileModal from './ReplaceFileModal.vue';

type Props = {
	file: ProjectFile;
	isReadOnly?: boolean;
	location: 'card' | 'preview';
};

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
});

const emit = defineEmits<{
	preview: [];
	onDeleted: [];
}>();

const filesStore = useFilesStore();
const uiStore = useUIStore();
const favoritesStore = useFavoritesStore();
const { getTotalCount } = useDependencies();

const i18n = useI18n();
const message = useMessage();
const toast = useToast();

const renameModalKey = computed(() => `${RENAME_FILE_MODAL_KEY}-${props.file.id}`);
const replaceModalKey = computed(() => `${REPLACE_FILE_MODAL_KEY}-${props.file.id}`);

const usedByCount = computed(() => getTotalCount(props.file.id));

const quotaExceeded = computed(() => filesStore.quotaStatus === 'error');

const actions = computed<Array<UserAction<IUser>>>(() => {
	const permissions = filesStore.projectPermissions.file;
	const availableActions: Array<UserAction<IUser>> = [
		{
			label: i18n.baseText('files.actions.preview'),
			value: FILE_CARD_ACTIONS.PREVIEW,
			disabled: false,
		},
		{
			label: i18n.baseText('files.actions.download'),
			value: FILE_CARD_ACTIONS.DOWNLOAD,
			disabled: false,
		},
	];
	// Mutations are hidden (not disabled) when the user lacks permission, and
	// disabled when the environment is read-only or the storage quota is full.
	if (permissions.update) {
		availableActions.push({
			label: i18n.baseText('files.actions.replace'),
			value: FILE_CARD_ACTIONS.REPLACE,
			disabled: props.isReadOnly || quotaExceeded.value,
		});
		availableActions.push({
			label: i18n.baseText('generic.rename'),
			value: FILE_CARD_ACTIONS.RENAME,
			disabled: props.isReadOnly,
		});
	}
	availableActions.push({
		label: favoritesStore.isFavorite(props.file.id, 'file')
			? i18n.baseText('favorites.remove')
			: i18n.baseText('favorites.add'),
		value: FILE_CARD_ACTIONS.FAVORITE,
		disabled: false,
	});
	if (permissions.delete) {
		availableActions.push({
			label: i18n.baseText('generic.delete'),
			value: FILE_CARD_ACTIONS.DELETE,
			disabled: props.isReadOnly,
		});
	}
	return availableActions;
});

const onAction = async (action: string) => {
	switch (action) {
		case FILE_CARD_ACTIONS.PREVIEW: {
			emit('preview');
			break;
		}
		case FILE_CARD_ACTIONS.DOWNLOAD: {
			filesStore.downloadFile(props.file);
			break;
		}
		case FILE_CARD_ACTIONS.REPLACE: {
			uiStore.openModal(replaceModalKey.value);
			break;
		}
		case FILE_CARD_ACTIONS.RENAME: {
			uiStore.openModal(renameModalKey.value);
			break;
		}
		case FILE_CARD_ACTIONS.FAVORITE: {
			await favoritesStore.toggleFavorite(props.file.id, 'file');
			break;
		}
		case FILE_CARD_ACTIONS.DELETE: {
			const descriptionLines = [
				i18n.baseText('files.delete.confirm.description', {
					interpolate: { name: escapeHtml(props.file.name) },
				}),
			];
			if (usedByCount.value > 0) {
				descriptionLines.push(
					i18n.baseText('files.delete.confirm.usedBy', {
						adjustToNumber: usedByCount.value,
						interpolate: { count: String(usedByCount.value) },
					}),
				);
			}
			const promptResponse = await message.confirm(
				descriptionLines.join(' '),
				i18n.baseText('files.delete.confirm.title'),
				{
					confirmButtonText: i18n.baseText('generic.delete'),
					cancelButtonText: i18n.baseText('generic.cancel'),
				},
			);
			if (promptResponse === MODAL_CONFIRM) {
				await deleteFile();
			}
			break;
		}
	}
};

const deleteFile = async () => {
	try {
		const result = await filesStore.deleteFile(props.file.id, props.file.projectId);
		if (!result.deleted) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		emit('onDeleted');
	} catch (error) {
		toast.showError(error, i18n.baseText('files.delete.error'));
	}
};
</script>
<template>
	<div>
		<N8nActionToggle
			:actions="actions"
			theme="dark"
			data-test-id="file-card-actions"
			@action="onAction"
		/>
		<RenameFileModal
			:modal-name="renameModalKey"
			:file="props.file"
			@close="() => uiStore.closeModal(renameModalKey)"
		/>
		<ReplaceFileModal
			:modal-name="replaceModalKey"
			:file="props.file"
			@close="() => uiStore.closeModal(replaceModalKey)"
		/>
	</div>
</template>
