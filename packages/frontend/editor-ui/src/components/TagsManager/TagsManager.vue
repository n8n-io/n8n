<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import TagsView from '@/components/TagsManager/TagsView/TagsView.vue';
import NoTagsView from '@/components/TagsManager/NoTagsView.vue';
import Modal from '@/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import { ElRow } from 'element-plus';
import { N8nButton } from '@n8n/design-system';
interface TagsManagerProps {
	modalKey: string;
	usageLocaleKey?: BaseTextKey;
	usageColumnTitleLocaleKey?: BaseTextKey;
	titleLocaleKey?: BaseTextKey;
	noTagsTitleLocaleKey?: BaseTextKey;
	noTagsDescriptionLocaleKey?: BaseTextKey;
	tags: ITag[];
	isLoading: boolean;
	onFetchTags: () => Promise<void>;
	onCreateTag: (name: string) => Promise<ITag>;
	onUpdateTag: (id: string, name: string) => Promise<ITag>;
	onDeleteTag: (id: string) => Promise<boolean>;
}

const props = withDefaults(defineProps<TagsManagerProps>(), {
	titleLocaleKey: 'tagsManager.manageTags',
	usageLocaleKey: 'tagsView.inUse',
	usageColumnTitleLocaleKey: 'tagsTable.usage',
	noTagsTitleLocaleKey: 'noTagsView.readyToOrganizeYourWorkflows',
	noTagsDescriptionLocaleKey: 'noTagsView.withWorkflowTagsYouReFree',
});

const emit = defineEmits<{
	'update:tags': [tags: ITag[]];
}>();

const tagIds = ref(props.tags.map((tag) => tag.id));
const isCreating = ref(false);
const modalBus = createEventBus();

const tags = computed(() =>
	tagIds.value
		.map((tagId) => props.tags.find((tag) => tag.id === tagId))
		.filter((tag): tag is ITag => Boolean(tag)),
);
const hasTags = computed(() => tags.value.length > 0);

const i18n = useI18n();

onMounted(() => {
	void props.onFetchTags();
});

function onEnableCreate() {
	isCreating.value = true;
}

function onDisableCreate() {
	isCreating.value = false;
}

async function onCreate(name: string, createCallback: (tag: ITag | null, error?: Error) => void) {
	try {
		if (!name) {
			throw new Error(i18n.baseText('tagsManager.tagNameCannotBeEmpty'));
		}

		const newTag = await props.onCreateTag(name);
		tagIds.value = [newTag.id, ...tagIds.value];
		emit('update:tags', [...props.tags, newTag]);
		createCallback(newTag);
	} catch (error) {
		// const escapedName = escape(name);
		// Implement showError function or emit an event for error handling
		createCallback(null, error as Error);
	}
}

async function onUpdate(
	id: string,
	name: string,
	updateCallback: (success: boolean, error?: Error) => void,
) {
	const tag = props.tags.find((t) => t.id === id);
	if (!tag) {
		updateCallback(false, new Error('Tag not found'));
		return;
	}
	const oldName = tag.name;

	try {
		if (!name) {
			throw new Error(i18n.baseText('tagsManager.tagNameCannotBeEmpty'));
		}

		if (name === oldName) {
			updateCallback(true);
			return;
		}

		const updatedTag = await props.onUpdateTag(id, name);
		emit(
			'update:tags',
			props.tags.map((t) => (t.id === id ? updatedTag : t)),
		);
		updateCallback(true);
	} catch (error) {
		updateCallback(false, error as Error);
	}
}

async function onDelete(id: string, deleteCallback: (deleted: boolean, error?: Error) => void) {
	const tag = props.tags.find((t) => t.id === id);
	if (!tag) {
		deleteCallback(false, new Error('Tag not found'));
		return;
	}

	try {
		const deleted = await props.onDeleteTag(id);
		if (!deleted) {
			throw new Error(i18n.baseText('tagsManager.couldNotDeleteTag'));
		}

		tagIds.value = tagIds.value.filter((tagId) => tagId !== id);
		emit(
			'update:tags',
			props.tags.filter((t) => t.id !== id),
		);
		deleteCallback(deleted);
	} catch (error) {
		deleteCallback(false, error as Error);
	}
}

function onEnter() {
	if (props.isLoading) {
		return;
	} else if (!hasTags.value) {
		onEnableCreate();
	} else {
		modalBus.emit('close');
	}
}
</script>

<template>
	<Modal
		:title="i18n.baseText(titleLocaleKey)"
		:name="modalKey"
		:event-bus="modalBus"
		min-width="620px"
		min-height="420px"
		@enter="onEnter"
	>
		<template #content>
			<ElRow>
				<TagsView
					v-if="hasTags || isCreating"
					:is-loading="isLoading"
					:tags="tags"
					:usage-locale-key="usageLocaleKey"
					:usage-column-title-locale-key="usageColumnTitleLocaleKey"
					@create="onCreate"
					@update="onUpdate"
					@delete="onDelete"
					@disable-create="onDisableCreate"
				/>
				<NoTagsView
					v-else
					:title-locale-key="noTagsTitleLocaleKey"
					:description-locale-key="noTagsDescriptionLocaleKey"
					@enable-create="onEnableCreate"
				/>
			</ElRow>
		</template>
		<template #footer="{ close }">
			<N8nButton :label="i18n.baseText('tagsManager.done')" float="right" @click="close" />
		</template>
	</Modal>
</template>
