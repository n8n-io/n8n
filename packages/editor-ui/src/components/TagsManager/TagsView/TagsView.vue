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
			data-test-id="tags-table"
			@new-name-change="onNewNameChange"
			@update-enable="onUpdateEnable"
			@delete-enable="onDeleteEnable"
			@cancel-operation="cancelOperation"
			@apply-operation="applyOperation"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import type { ITag, ITagRow } from '@/Interface';
import TagsTableHeader from '@/components/TagsManager/TagsView/TagsTableHeader.vue';
import TagsTable from '@/components/TagsManager/TagsView/TagsTable.vue';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { useRBACStore } from '@/stores/rbac.store';

const matches = (name: string, filter: string) =>
	name.toLowerCase().trim().includes(filter.toLowerCase().trim());

export default defineComponent({
	name: 'TagsView',
	components: { TagsTableHeader, TagsTable },
	props: {
		tags: {
			type: Array as () => ITag[],
			required: true,
		},
		isLoading: {
			type: Boolean,
			required: true,
		},
	},
	emits: {
		update: null,
		delete: null,
		create: null,
		disableCreate: null,
	},
	data() {
		return {
			createEnabled: false,
			deleteId: '',
			updateId: '',
			search: '',
			newName: '',
			stickyIds: new Set(),
			isSaving: false,
		};
	},
	computed: {
		...mapStores(useUsersStore, useRBACStore),
		isCreateEnabled(): boolean {
			return (this.tags || []).length === 0 || this.createEnabled;
		},
		rows(): ITagRow[] {
			const getUsage = (count: number | undefined) =>
				count && count > 0
					? this.$locale.baseText('tagsView.inUse', { adjustToNumber: count })
					: this.$locale.baseText('tagsView.notBeingUsed');

			const disabled = this.isCreateEnabled || !!this.updateId || !!this.deleteId;
			const tagRows = (this.tags ?? [])
				.filter((tag) => this.stickyIds.has(tag.id) || matches(tag.name, this.search))
				.map(
					(tag): ITagRow => ({
						tag,
						usage: getUsage(tag.usageCount),
						disable: disabled && tag.id !== this.deleteId && tag.id !== this.updateId,
						update: disabled && tag.id === this.updateId,
						delete: disabled && tag.id === this.deleteId,
						canDelete: this.rbacStore.hasScope('tag:delete'),
					}),
				);

			return this.isCreateEnabled ? [{ create: true }, ...tagRows] : tagRows;
		},
	},
	methods: {
		onNewNameChange(name: string): void {
			this.newName = name;
		},
		onSearchChange(search: string): void {
			this.stickyIds.clear();
			this.search = search;
		},
		isHeaderDisabled(): boolean {
			return this.isLoading || !!(this.isCreateEnabled || this.updateId || this.deleteId);
		},

		onUpdateEnable(updateId: string): void {
			this.updateId = updateId;
		},
		disableUpdate(): void {
			this.updateId = '';
			this.newName = '';
		},
		updateTag(): void {
			this.isSaving = true;
			const name = this.newName.trim();
			const onUpdate = (updated: boolean) => {
				this.isSaving = false;
				if (updated) {
					this.stickyIds.add(this.updateId);
					this.disableUpdate();
				}
			};

			this.$emit('update', this.updateId, name, onUpdate);
		},

		onDeleteEnable(deleteId: string): void {
			this.deleteId = deleteId;
		},
		disableDelete(): void {
			this.deleteId = '';
		},
		deleteTag(): void {
			this.isSaving = true;
			const onDelete = (deleted: boolean) => {
				if (deleted) {
					this.disableDelete();
				}
				this.isSaving = false;
			};

			this.$emit('delete', this.deleteId, onDelete);
		},

		onCreateEnable(): void {
			this.createEnabled = true;
			this.newName = '';
		},
		disableCreate(): void {
			this.createEnabled = false;
			this.$emit('disableCreate');
		},
		createTag(): void {
			this.isSaving = true;
			const name = this.newName.trim();
			const onCreate = (created: ITag | null) => {
				if (created) {
					this.stickyIds.add(created.id);
					this.disableCreate();
				}
				this.isSaving = false;
			};

			this.$emit('create', name, onCreate);
		},

		applyOperation(): void {
			if (this.isSaving) {
				return;
			} else if (this.isCreateEnabled) {
				this.createTag();
			} else if (this.updateId) {
				this.updateTag();
			} else if (this.deleteId) {
				this.deleteTag();
			}
		},
		cancelOperation(): void {
			if (this.isSaving) {
				return;
			} else if (this.isCreateEnabled) {
				this.disableCreate();
			} else if (this.updateId) {
				this.disableUpdate();
			} else if (this.deleteId) {
				this.disableDelete();
			}
		},
	},
});
</script>
