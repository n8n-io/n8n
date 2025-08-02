<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { ITagRow } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import TagsTableHeader from '@/components/TagsManager/TagsView/TagsTableHeader.vue';
import TagsTable from '@/components/TagsManager/TagsView/TagsTable.vue';
import { useRBACStore } from '@/stores/rbac.store';
import type { BaseTextKey } from '@n8n/i18n';

defineOptions({ name: 'TagsView' });

const props = withDefaults(
	defineProps<{
		usageColumnTitleLocaleKey?: BaseTextKey;
		usageLocaleKey?: BaseTextKey;
		tags: ITag[];
		isLoading: boolean;
	}>(),
	{
		usageColumnTitleLocaleKey: 'tagsTable.usage',
		usageLocaleKey: 'tagsView.inUse',
	},
);

const emit = defineEmits<{
	update: [updateId: string, name: string, onUpdate: (updated: boolean) => void];
	delete: [deleteId: string, onDelete: (deleted: boolean) => void];
	create: [name: string, onCreate: (created: ITag | null) => void];
	disableCreate: [];
}>();

const matches = (name: string, filter: string) =>
	name.toLowerCase().trim().includes(filter.toLowerCase().trim());

const i18n = useI18n();
const rbacStore = useRBACStore();

const createEnabled = ref(false);
const deleteId = ref('');
const updateId = ref('');
const search = ref('');
const newName = ref('');
const stickyIds = ref(new Set());
const isSaving = ref(false);

const isCreateEnabled = computed(() => props.tags.length === 0 || createEnabled.value);

const rows = computed(() => {
	const getUsage = (count: number | undefined) =>
		count && count > 0
			? i18n.baseText(props.usageLocaleKey, { adjustToNumber: count })
			: i18n.baseText('tagsView.notBeingUsed');

	const disabled = isCreateEnabled.value || !!updateId.value || !!deleteId.value;
	const tagRows = props.tags
		.filter((tag) => stickyIds.value.has(tag.id) || matches(tag.name, search.value))
		.map(
			(tag): ITagRow => ({
				tag,
				usage: getUsage(tag.usageCount),
				disable: disabled && tag.id !== deleteId.value && tag.id !== updateId.value,
				update: disabled && tag.id === updateId.value,
				delete: disabled && tag.id === deleteId.value,
				canDelete: rbacStore.hasScope('tag:delete'),
			}),
		);

	return isCreateEnabled.value ? [{ create: true }, ...tagRows] : tagRows;
});

const onNewNameChange = (name: string): void => {
	newName.value = name;
};

const onSearchChange = (searchValue: string): void => {
	stickyIds.value.clear();
	search.value = searchValue;
};

const isHeaderDisabled = (): boolean => {
	return props.isLoading || !!(isCreateEnabled.value || updateId.value || deleteId.value);
};

const onUpdateEnable = (updateIdValue: string): void => {
	updateId.value = updateIdValue;
};

const disableUpdate = (): void => {
	updateId.value = '';
	newName.value = '';
};

const updateTag = (): void => {
	isSaving.value = true;
	const name = newName.value.trim();
	const onUpdate = (updated: boolean) => {
		isSaving.value = false;
		if (updated) {
			stickyIds.value.add(updateId.value);
			disableUpdate();
		}
	};

	emit('update', updateId.value, name, onUpdate);
};

const onDeleteEnable = (deleteIdValue: string): void => {
	deleteId.value = deleteIdValue;
};

const disableDelete = (): void => {
	deleteId.value = '';
};

const deleteTag = (): void => {
	isSaving.value = true;
	const onDelete = (deleted: boolean) => {
		if (deleted) {
			disableDelete();
		}
		isSaving.value = false;
	};

	emit('delete', deleteId.value, onDelete);
};

const onCreateEnable = (): void => {
	createEnabled.value = true;
	newName.value = '';
};

const disableCreate = (): void => {
	createEnabled.value = false;
	emit('disableCreate');
};

const createTag = (): void => {
	isSaving.value = true;
	const name = newName.value.trim();
	const onCreate = (created: ITag | null) => {
		if (created) {
			stickyIds.value.add(created.id);
			disableCreate();
		}
		isSaving.value = false;
	};

	emit('create', name, onCreate);
};

const applyOperation = (): void => {
	if (isSaving.value) {
		return;
	} else if (isCreateEnabled.value) {
		createTag();
	} else if (updateId.value) {
		updateTag();
	} else if (deleteId.value) {
		deleteTag();
	}
};

const cancelOperation = (): void => {
	if (isSaving.value) {
		return;
	} else if (isCreateEnabled.value) {
		disableCreate();
	} else if (updateId.value) {
		disableUpdate();
	} else if (deleteId.value) {
		disableDelete();
	}
};
</script>

<template>
	<div @keyup.enter="applyOperation" @keyup.esc="cancelOperation">
		<TagsTableHeader
			:search="search"
			:disabled="isHeaderDisabled()"
			@search-change="onSearchChange"
			@create-enable="onCreateEnable"
		/>
		<TagsTable
			ref="tagsTable"
			:rows="rows"
			:is-loading="isLoading"
			:is-saving="isSaving"
			:new-name="newName"
			:usage-column-title-locale-key="usageColumnTitleLocaleKey"
			data-test-id="tags-table"
			@new-name-change="onNewNameChange"
			@update-enable="onUpdateEnable"
			@delete-enable="onDeleteEnable"
			@cancel-operation="cancelOperation"
			@apply-operation="applyOperation"
		/>
	</div>
</template>
