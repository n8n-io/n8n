<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useTagsStore } from '@/stores/tags.store';
import TagsManager from './TagsManager.vue';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import { TAGS_MANAGER_MODAL_KEY } from '@/constants';

const i18n = useI18n();
const { showError, showMessage } = useToast();
const tagsStore = useTagsStore();

const tags = computed(() => tagsStore.allTags);
const isLoading = computed(() => tagsStore.isLoading);

async function fetchTags() {
	try {
		await tagsStore.fetchAll({ force: true, withUsageCount: true });
	} catch (error) {
		showError(
			error,
			i18n.baseText('tagsManager.showError.onFetch.title'),
			i18n.baseText('tagsManager.showError.onFetch.message'),
		);
	}
}

async function createTag(name: string): Promise<ITag> {
	try {
		return await tagsStore.create(name);
	} catch (error) {
		const escapedName = escape(name);
		showError(
			error,
			i18n.baseText('tagsManager.showError.onCreate.title'),
			i18n.baseText('tagsManager.showError.onCreate.message', {
				interpolate: { escapedName },
			}) + ':',
		);
		throw error;
	}
}

async function updateTag(id: string, name: string): Promise<ITag> {
	try {
		const updatedTag = await tagsStore.rename({ id, name });
		showMessage({
			title: i18n.baseText('tagsManager.showMessage.onUpdate.title'),
			type: 'success',
		});
		return updatedTag;
	} catch (error) {
		const escapedName = escape(name);
		showError(
			error,
			i18n.baseText('tagsManager.showError.onUpdate.title'),
			i18n.baseText('tagsManager.showError.onUpdate.message', {
				interpolate: { escapedName },
			}) + ':',
		);
		throw error;
	}
}

async function deleteTag(id: string): Promise<boolean> {
	try {
		const deleted = await tagsStore.deleteTagById(id);
		if (!deleted) {
			throw new Error(i18n.baseText('tagsManager.couldNotDeleteTag'));
		}
		showMessage({
			title: i18n.baseText('tagsManager.showMessage.onDelete.title'),
			type: 'success',
		});
		return deleted;
	} catch (error) {
		const tag = tagsStore.tagsById[id];
		const escapedName = escape(tag?.name || '');
		showError(
			error,
			i18n.baseText('tagsManager.showError.onDelete.title'),
			i18n.baseText('tagsManager.showError.onDelete.message', {
				interpolate: { escapedName },
			}) + ':',
		);
		throw error;
	}
}
</script>

<template>
	<TagsManager
		:modal-key="TAGS_MANAGER_MODAL_KEY"
		:tags="tags"
		:is-loading="isLoading"
		:on-fetch-tags="fetchTags"
		:on-create-tag="createTag"
		:on-update-tag="updateTag"
		:on-delete-tag="deleteTag"
	/>
</template>
