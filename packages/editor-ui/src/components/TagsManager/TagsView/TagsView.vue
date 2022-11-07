<template>
	<div @keyup.enter="applyOperation" @keyup.esc="cancelOperation">
		<TagsTableHeader
			:search="search"
			:disabled="isHeaderDisabled()"
			@searchChange="onSearchChange"
			@createEnable="onCreateEnable"
		/>
		<TagsTable
			:rows="rows"
			:isLoading="isLoading"
			:isSaving="isSaving"

			:newName="newName"
			@newNameChange="onNewNameChange"

			@updateEnable="onUpdateEnable"
			@deleteEnable="onDeleteEnable"

			@cancelOperation="cancelOperation"
			@applyOperation="applyOperation"

			ref="tagsTable"
		/>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

import { ITag, ITagRow } from "@/Interface";
import TagsTableHeader from "@/components/TagsManager/TagsView/TagsTableHeader.vue";
import TagsTable from "@/components/TagsManager/TagsView/TagsTable.vue";
import { mapGetters } from 'vuex';
import { mapStores } from "pinia";
import { useUsersStore } from "@/stores/users";

const matches = (name: string, filter: string) => name.toLowerCase().trim().includes(filter.toLowerCase().trim());

export default Vue.extend({
	components: { TagsTableHeader, TagsTable },
	name: "TagsView",
	props: ["tags", "isLoading"],
	data() {
		return {
			createEnabled: false,
			deleteId: "",
			updateId: "",
			search: "",
			newName: "",
			stickyIds: new Set(),
			isSaving: false,
		};
	},
	computed: {
		...mapStores(useUsersStore),
		isCreateEnabled(): boolean {
			return (this.$props.tags || []).length === 0 || this.$data.createEnabled;
		},
		rows(): ITagRow[] {
			const getUsage = (count: number | undefined) => count && count > 0
				? this.$locale.baseText('tagsView.inUse', { adjustToNumber: count })
				: this.$locale.baseText('tagsView.notBeingUsed');

			const disabled = this.isCreateEnabled || this.$data.updateId || this.$data.deleteId;
			const tagRows = (this.$props.tags || [])
				.filter((tag: ITag) => this.stickyIds.has(tag.id) || matches(tag.name, this.$data.search))
				.map((tag: ITag): ITagRow => ({
					tag,
					usage: getUsage(tag.usageCount),
					disable: disabled && tag.id !== this.deleteId && tag.id !== this.$data.updateId,
					update: disabled && tag.id === this.$data.updateId,
					delete: disabled && tag.id === this.$data.deleteId,
					canDelete: this.usersStore.canUserDeleteTags,
				}));

			return this.isCreateEnabled
				? [{ create: true }, ...tagRows]
				: tagRows;
		},
	},
	methods: {
		onNewNameChange(name: string): void {
			this.newName = name;
		},
		onSearchChange(search: string): void {
			this.$data.stickyIds.clear();
			this.$data.search = search;
		},
		isHeaderDisabled(): boolean {
			return (
				this.$props.isLoading ||
				!!(this.isCreateEnabled || this.$data.updateId || this.$data.deleteId)
			);
		},

		onUpdateEnable(updateId: string): void {
			this.updateId = updateId;
		},
		disableUpdate(): void {
			this.updateId = "";
			this.newName = "";
		},
		updateTag(): void {
			this.$data.isSaving = true;
			const name = this.newName.trim();
			const onUpdate = (updated: boolean) => {
				this.$data.isSaving = false;
				if (updated) {
					this.stickyIds.add(this.updateId);
					this.disableUpdate();
				}
			};

			this.$emit("update", this.updateId, name, onUpdate);
		},

		onDeleteEnable(deleteId: string): void {
			this.deleteId = deleteId;
		},
		disableDelete(): void {
			this.deleteId = "";
		},
		deleteTag(): void {
			this.$data.isSaving = true;
			const onDelete =  (deleted: boolean) => {
				if (deleted) {
					this.disableDelete();
				}
				this.$data.isSaving = false;
			};

			this.$emit("delete", this.deleteId, onDelete);
		},

		onCreateEnable(): void {
			this.$data.createEnabled = true;
			this.$data.newName = "";
		},
		disableCreate(): void {
			this.$data.createEnabled = false;
			this.$emit("disableCreate");
		},
		createTag(): void {
			this.$data.isSaving = true;
			const name = this.$data.newName.trim();
			const onCreate = (created: ITag | null, error?: Error) => {
				if (created) {
					this.stickyIds.add(created.id);
					this.disableCreate();
				}
				this.$data.isSaving = false;
			};

			this.$emit("create", name, onCreate);
		},

		applyOperation(): void {
			if (this.$data.isSaving) {
				return;
			}
			else if (this.isCreateEnabled) {
				this.createTag();
			}
			else if (this.$data.updateId) {
				this.updateTag();
			}
			else if (this.$data.deleteId) {
				this.deleteTag();
			}
		},
		cancelOperation(): void {
			if (this.$data.isSaving) {
				return;
			}
			else if (this.isCreateEnabled) {
				this.disableCreate();
			}
			else if (this.$data.updateId) {
				this.disableUpdate();
			}
			else if (this.$data.deleteId) {
				this.disableDelete();
			}
		},
	},
});
</script>
