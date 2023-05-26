<template>
	<Modal
		:title="$locale.baseText('tagsManager.manageTags')"
		:name="TAGS_MANAGER_MODAL_KEY"
		:eventBus="modalBus"
		@enter="onEnter"
		minWidth="620px"
		minHeight="420px"
	>
		<template #content>
			<el-row>
				<TagsView
					v-if="hasTags || isCreating"
					:isLoading="isLoading"
					:tags="tags"
					@create="onCreate"
					@update="onUpdate"
					@delete="onDelete"
					@disableCreate="onDisableCreate"
				/>
				<NoTagsView @enableCreate="onEnableCreate" v-else />
			</el-row>
		</template>
		<template #footer="{ close }">
			<n8n-button :label="$locale.baseText('tagsManager.done')" @click="close" float="right" />
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import type { ITag } from '@/Interface';

import { useToast } from '@/composables';
import TagsView from '@/components/TagsManager/TagsView/TagsView.vue';
import NoTagsView from '@/components/TagsManager/NoTagsView.vue';
import Modal from '@/components/Modal.vue';
import { TAGS_MANAGER_MODAL_KEY } from '@/constants';
import { mapStores } from 'pinia';
import { useTagsStore } from '@/stores/tags.store';
import { createEventBus } from 'n8n-design-system';

export default defineComponent({
	name: 'TagsManager',
	setup() {
		return {
			...useToast(),
		};
	},
	created() {
		void this.tagsStore.fetchAll({ force: true, withUsageCount: true });
	},
	data() {
		const tagIds = useTagsStore().allTags.map((tag) => tag.id);
		return {
			tagIds,
			isCreating: false,
			modalBus: createEventBus(),
			TAGS_MANAGER_MODAL_KEY,
		};
	},
	components: {
		TagsView,
		NoTagsView,
		Modal,
	},
	computed: {
		...mapStores(useTagsStore),
		isLoading(): boolean {
			return this.tagsStore.isLoading;
		},
		tags(): ITag[] {
			return this.$data.tagIds
				.map((tagId: string) => this.tagsStore.getTagById(tagId))
				.filter(Boolean); // if tag is deleted from store
		},
		hasTags(): boolean {
			return this.tags.length > 0;
		},
	},
	methods: {
		onEnableCreate() {
			this.$data.isCreating = true;
		},

		onDisableCreate() {
			this.$data.isCreating = false;
		},

		async onCreate(name: string, cb: (tag: ITag | null, error?: Error) => void) {
			try {
				if (!name) {
					throw new Error(this.$locale.baseText('tagsManager.tagNameCannotBeEmpty'));
				}

				const newTag = await this.tagsStore.create(name);
				this.$data.tagIds = [newTag.id].concat(this.$data.tagIds);
				cb(newTag);
			} catch (error) {
				const escapedName = escape(name);
				this.showError(
					error,
					this.$locale.baseText('tagsManager.showError.onCreate.title'),
					this.$locale.baseText('tagsManager.showError.onCreate.message', {
						interpolate: { escapedName },
					}) + ':',
				);
				cb(null, error);
			}
		},

		async onUpdate(id: string, name: string, cb: (tag: boolean, error?: Error) => void) {
			const tag = this.tagsStore.getTagById(id);
			const oldName = tag.name;

			try {
				if (!name) {
					throw new Error(this.$locale.baseText('tagsManager.tagNameCannotBeEmpty'));
				}

				if (name === oldName) {
					cb(true);
					return;
				}

				const updatedTag = await this.tagsStore.rename({ id, name });
				cb(!!updatedTag);

				this.showMessage({
					title: this.$locale.baseText('tagsManager.showMessage.onUpdate.title'),
					type: 'success',
				});
			} catch (error) {
				const escapedName = escape(oldName);
				this.showError(
					error,
					this.$locale.baseText('tagsManager.showError.onUpdate.title'),
					this.$locale.baseText('tagsManager.showError.onUpdate.message', {
						interpolate: { escapedName },
					}) + ':',
				);
				cb(false, error);
			}
		},

		async onDelete(id: string, cb: (deleted: boolean, error?: Error) => void) {
			const tag = this.tagsStore.getTagById(id);
			const name = tag.name;

			try {
				const deleted = await this.tagsStore.delete(id);
				if (!deleted) {
					throw new Error(this.$locale.baseText('tagsManager.couldNotDeleteTag'));
				}

				this.$data.tagIds = this.$data.tagIds.filter((tagId: string) => tagId !== id);

				cb(deleted);

				this.showMessage({
					title: this.$locale.baseText('tagsManager.showMessage.onDelete.title'),
					type: 'success',
				});
			} catch (error) {
				const escapedName = escape(name);
				this.showError(
					error,
					this.$locale.baseText('tagsManager.showError.onDelete.title'),
					this.$locale.baseText('tagsManager.showError.onDelete.message', {
						interpolate: { escapedName },
					}) + ':',
				);
				cb(false, error);
			}
		},

		onEnter() {
			if (this.isLoading) {
				return;
			} else if (!this.hasTags) {
				this.onEnableCreate();
			} else {
				this.modalBus.emit('close');
			}
		},
	},
});
</script>
