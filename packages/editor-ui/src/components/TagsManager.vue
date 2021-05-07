<template>
	<Modal
		title="Manage tags"
		:name="modalName"
		:eventBus="modalBus"
		@enter="onEnter"
		size="md"
	>
		<template slot="content">
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
				<NoTagsView 
					@enableCreate="onEnableCreate"
					v-else />
			</el-row>
		</template>
		<template v-slot:footer="{ close }">
				<el-button size="small" @click="close">Done</el-button>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from "vue";
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";

import { ITag } from "@/Interface";

import { showMessage } from "@/components/mixins/showMessage";
import TagsView from "@/components/TagsManagerTagsView.vue";
import NoTagsView from "@/components/TagsManagerNoTagsView.vue";
import Modal from "@/components/Modal.vue";

export default mixins(showMessage).extend({
	name: "TagsManager",
	created() {
		this.$store.dispatch("tags/fetchAll", {force: true, withUsageCount: true});
	},
	props: ['modalName'],
	data() {
		const tagIds = (this.$store.getters['tags/allTags'] as ITag[])
			.map((tag): string => tag.id);

		return {
			tagIds,
			isCreating: false,
			modalBus: new Vue(),
		};
	},
	components: {
		TagsView,
		NoTagsView,
		Modal,
	},
	computed: {
		...mapGetters("tags", ["isLoading"]),
		tags(): ITag[] {
			return this.$data.tagIds.map((tagId: string) => this.$store.getters['tags/getTagById'](tagId))
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
					throw new Error("Tag name was not set");
				}

				const newTag = await this.$store.dispatch("tags/create", name);
				this.$data.tagIds = [newTag.id].concat(this.$data.tagIds);
				cb(newTag);

				this.$showMessage({
					title: "New tag was created",
					message: `"${name}" was added to your tag collection`,
					type: "success",
				});
			} catch (error) {
				this.$showError(
					error,
					"New tag was not created",
					`A problem occurred when trying to create the "${name}" tag`,
				);
				cb(null, error);
			}
		},

		async onUpdate(id: string, name: string, cb: (tag: boolean, error?: Error) => void) {
			const tag = this.$store.getters['tags/getTagById'](id);
			const oldName = tag.name;

			try {
				if (!name) {
					throw new Error("Tag name was not set");
				}

				if (name === oldName) {
					cb(true);
					return;
				}
				
				const updatedTag = await this.$store.dispatch("tags/rename", { id, name });
				cb(!!updatedTag);

				this.$showMessage({
					title: "Tag was updated",
					message: `The "${oldName}" tag was successfully updated to "${name}"`,
					type: "success",
				});
			} catch (error) {
				this.$showError(
					error,
					"Tag was not updated",
					`A problem occurred when trying to update the "${oldName}" tag`,
				);
				cb(false, error);
			}
		},

		async onDelete(id: string, cb: (deleted: boolean, error?: Error) => void) {
			const tag = this.$store.getters['tags/getTagById'](id);
			const name = tag.name;

			try {
				const deleted = await this.$store.dispatch("tags/delete", id);
				if (!deleted) {
					throw new Error('Could not delete tag');
				}

				this.$data.tagIds = this.$data.tagIds.filter((tagId: string) => tagId !== id);

				cb(deleted);

				this.$showMessage({
					title: "Tag was deleted",
					message: `The "${name}" tag was successfully deleted from your tag collection`,
					type: "success",
				});
			} catch (error) {
				this.$showError(
					error,
					"Tag was not deleted",
					`A problem occurred when trying to delete the "${name}" tag`,
				);
				cb(false, error);
			}
		},

		onEnter() {
			if (this.isLoading) {
				return;
			}
			else if (!this.hasTags) {
				this.onEnableCreate();
			}
			else {
				this.modalBus.$emit('close');
			}
		},
	},
});
</script>

<style lang="scss" scoped>	
.el-row {
	min-height: $--tags-manager-min-height;
}
</style>