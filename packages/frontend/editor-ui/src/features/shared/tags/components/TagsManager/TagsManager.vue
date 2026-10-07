<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import TagsView from './TagsView/TagsView.vue';
import NoTagsView from './NoTagsView.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { ElRow } from 'element-plus';
import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter } from '@n8n/design-system';
interface TagsManagerProps {
	modalKey: string;
	usageLocaleKey?: BaseTextKey;
	usageColumnTitleLocaleKey?: BaseTextKey;
	titleLocaleKey?: BaseTextKey;
	noTagsTitleLocaleKey?: BaseTextKey;
	noTagsDescriptionLocaleKey?: BaseTextKey;
	noTagsCreateLocaleKey?: BaseTextKey;
	tags: ITag[];
	isLoading: boolean;
	canCreate: boolean;
	canUpdate: boolean;
	canDelete: boolean;
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
	noTagsCreateLocaleKey: 'noTagsView.createTag',
});

const emit = defineEmits<{
	'update:tags': [tags: ITag[]];
}>();

const tagIds = ref(props.tags.map((tag) => tag.id));
const isCreating = ref(false);
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalKey]?.open === true);

const tags = computed(() =>
	tagIds.value
		.map((tagId) => props.tags.find((tag) => tag.id === tagId))
		.filter((tag): tag is ITag => Boolean(tag)),
);
const hasTags = computed(() => tags.value.length > 0);

const i18n = useI18n();

function closeDialog() {
	uiStore.closeModal(props.modalKey);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

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
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="xlarge"
		:header="i18n.baseText(titleLocaleKey)"
		:container-class="$style.dialog"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<ElRow>
				<TagsView
					v-if="hasTags || isCreating"
					:is-loading="isLoading"
					:tags="tags"
					:usage-locale-key="usageLocaleKey"
					:usage-column-title-locale-key="usageColumnTitleLocaleKey"
					:can-create="canCreate"
					:can-update="canUpdate"
					:can-delete="canDelete"
					@create="onCreate"
					@update="onUpdate"
					@delete="onDelete"
					@disable-create="onDisableCreate"
				/>
				<NoTagsView
					v-else
					:title-locale-key="noTagsTitleLocaleKey"
					:description-locale-key="noTagsDescriptionLocaleKey"
					:create-locale-key="noTagsCreateLocaleKey"
					:can-create="canCreate"
					@enable-create="onEnableCreate"
				/>
			</ElRow>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="subtle" :label="i18n.baseText('tagsManager.done')" @click="closeDialog" />
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.dialog {
	min-height: 420px;
}
</style>
