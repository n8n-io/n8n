<template>
	<div v-if="dialogVisible">
		<el-dialog
			:visible="dialogVisible"
			:before-close="closeDialog"
			title="Manage Tags"
			append-to-body
		>
			<div class="content" @keydown.stop>
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
			</div>
			<el-row class="footer">
				<el-button size="small" @click="closeDialog">Done</el-button>
			</el-row>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import { ITag } from "@/Interface";

import { showMessage } from "@/components/mixins/showMessage";
import TagsView from "@/components/TagsManagerTagsView.vue";
import NoTagsView from "@/components/TagsManagerNoTagsView.vue";

import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";

export default mixins(showMessage).extend({
	name: "TagsManager",
	props: ["dialogVisible"],
	created() {
		this.$store.dispatch("tags/fetchAll", {force: true, withUsageCount: true});
	},
	data() {
		const tagIds = this.$store.getters['tags/tags']
			.map((tag: ITag): string => tag.id);

		return {
			tagIds,
			isCreating: false,
		};
	},
	components: {
		TagsView,
		NoTagsView,
	},
	computed: {
		...mapGetters("tags", ["isLoading"]),
		tags(): ITag[] {
			return this.$data.tagIds.map((tagId: string) => this.$store.getters['tags/getTagById'](tagId))
				.filter((tag: ITag | undefined) => !!tag);
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

		closeDialog() {
			this.$emit("closeDialog");
		},
	},
});
</script>


<style scoped lang="scss">
* {
	box-sizing: border-box;
}

/deep/ .el-dialog {
	max-width: 600px;
}

.content {
	min-height: 300px;
}

.footer {
	padding-top: 15px;

	.el-button {
		float: right;
	}
}
</style>