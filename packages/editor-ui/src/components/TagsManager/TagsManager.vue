<template>
	<Modal
		id="tags-manager-modal"
		:title="$locale.baseText('tagsManager.manageTags')"
		:name="TAGS_MANAGER_MODAL_KEY"
		:event-bus="modalBus"
		min-width="620px"
		min-height="420px"
		@enter="onEnter"
	>
		<template #content>
			<el-row>
				<TagsView
					v-if="hasTags || isCreating"
					:is-loading="isLoading"
					:tags="tags"
					@create="onCreate"
					@update="onUpdate"
					@delete="onDelete"
					@disable-create="onDisableCreate"
				/>
				<NoTagsView v-else @enable-create="onEnableCreate" />
			</el-row>
		</template>
		<template #footer="{ close }">
			<n8n-button :label="$locale.baseText('tagsManager.done')" float="right" @click="close" />
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import type { ITag } from '@/Interface';

import { useToast } from '@/composables/useToast';
import TagsView from '@/components/TagsManager/TagsView/TagsView.vue';
import NoTagsView from '@/components/TagsManager/NoTagsView.vue';
import Modal from '@/components/Modal.vue';
import { TAGS_MANAGER_MODAL_KEY } from '@/constants';
import { mapStores } from 'pinia';
import { useTagsStore } from '@/stores/tags.store';
import { createEventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: 'TagsManager',
	components: {
		TagsView,
		NoTagsView,
		Modal,
	},
	setup() {
		return {
			...useToast(),
		};
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
	created() {
		void this.tagsStore.fetchAll({ force: true, withUsageCount: true });
	},
	computed: {
		...mapStores(useTagsStore),
		isLoading(): boolean {
			return this.tagsStore.isLoading;
		},
		tags(): ITag[] {
			return this.tagIds.map((tagId: string) => this.tagsStore.getTagById(tagId)).filter(Boolean); // if tag is deleted from store
		},
		hasTags(): boolean {
			return this.tags.length > 0;
		},
	},
	methods: {
		onEnableCreate() {
			this.isCreating = true;
		},

		onDisableCreate() {
			this.isCreating = false;
		},

		async onCreate(name: string, cb: (tag: ITag | null, error?: Error) => void) {
			try {
				if (!name) {
					throw new Error(this.$locale.baseText('tagsManager.tagNameCannotBeEmpty'));
				}

				const newTag = await this.tagsStore.create(name);
				this.tagIds = [newTag.id].concat(this.tagIds);
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

				this.tagIds = this.tagIds.filter((tagId: string) => tagId !== id);

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
