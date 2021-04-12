<template>
	<el-dialog title="Manage Tags" :visible="dialogVisible">
		<div class="content">
			<el-row v-if="!isLoading">
				<TagsTable v-if="hasTags || isCreateEnabled"
						:tags="tags"

						:isCreateEnabled="isCreateEnabled"
						@enableCreate="enableCreate"
						@disableCreate="disableCreate"
						@onCreate="onCreate"

						:updateId="updateId"
						@onUpdate="onUpdate"
						@enableUpdate="enableUpdate"
						@disableUpdate="disableUpdate"

						:deleteId="deleteId"
						@onDelete="onDelete"
						@enableDelete="enableDelete"
						@disableDelete="disableDelete"
				/>
				<el-col class="notags" :span="16" :offset="4" v-else>
					<div class="icon">
						🗄️
					</div>
					<div>
						<div class="headline">
							Ready to organize your workflows?
						</div>
						<div class="description">
							With workflow tags, you're free to create the perfect tagging system for your flows
						</div>
					</div>
					<el-button @click="enableCreate">
						Create a tag
					</el-button>
				</el-col>
			</el-row>
		</div>
		<el-row class="footer">
			<el-button size="small" @click="closeDialog">Done</el-button>
		</el-row>
	</el-dialog>
</template>

<script lang="ts">
import { ITag } from '@/Interface';

import { showMessage } from '@/components/mixins/showMessage';
import TagsTable from '@/components/TagsManagerTagsTable.vue';

import mixins from 'vue-typed-mixins';

export default mixins(
	showMessage,
).extend({
	name: 'TagsManager',
	props: [
		'dialogVisible',
	],
	created() {
    	this.$store.dispatch('tags/getAll');
	},
	data() {
		return {
			isCreateEnabled: false,
			updateId: '',
			deleteId: '',
		};
	},
	components: {
		TagsTable,
	},
	computed: {
		tags(): ITag[] {
			return this.$store.getters['tags/allTags'];
		},
		hasTags(): boolean {
			return this.$store.getters['tags/allTags'].length > 0;
		},
		isLoading(): boolean {
			return this.$store.getters['tags/loading'];
		}
	},
	methods: {
		enableCreate() {
			this.$data.isCreateEnabled = true;
		},
		disableCreate() {
			this.$data.isCreateEnabled = false;
		},
		async onCreate(name: string, cb: (id: string) => void) {
			try {
				if (!name) {
					throw new Error("Tag name was not set");
				}

				const newTag = await this.$store.dispatch('tags/addNew', name);

				cb(newTag.id);
				this.$data.isCreateEnabled = false;

				this.$showMessage({
					title: 'New tag was created',
					message: `${name} was added to your tag collection`,
					type: 'success',
				});
			} catch(error) {
				this.$showError(error, 'New tag was not created', `A problem occurred when trying to create the "${name}" tag`);
			}
		},

		enableUpdate(updateId: number) {
			this.$data.updateId = `${updateId}`;
		},
		disableUpdate() {
			this.$data.updateId = '';
		},
		async onUpdate(id: number, name: string, oldName: string) {
			try {
				if (!name) {
					throw new Error("Tag name was not set");
				}

				await this.$store.dispatch('tags/rename', {id, name});

				this.$showMessage({
					title: 'Tag was updated',
					message: `The "${oldName}" tag was successfully updated to "${name}"`,
					type: 'success',
				});
				this.$data.updateId = '';
			}
			catch(error) {
				this.$showError(error, 'Tag was not updated', `A problem occurred when trying to update the "${oldName}" tag`);
			}
		},

		enableDelete(deleteId: number) {
			this.$data.deleteId = `${deleteId}`;
		},
		disableDelete() {
			this.$data.deleteId = '';
		},
		async onDelete(id: number, name: string) {
			try {
				await this.$store.dispatch('tags/delete', id);

				this.$showMessage({
					title: 'Tag was deleted',
					message: `The "${name}" tag was successfully deleted from your tag collection`,
					type: 'success',
				});
				this.$data.deleteId = '';
			}
			catch(error) {
				this.$showError(error, 'Tag was not deleted', `A problem occurred when trying to delete the "${name}" tag`);
			}
		},

		closeDialog() {
			this.$emit('closeDialog');
		}
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

.notags {
	word-break: normal;
	text-align: center;
	padding-top: 32px;

	> * {
		margin-bottom: 32px;
	}

	.icon {
		font-size: 36px;
		line-height: 14px;
	}

	.headline {
		font-size: 17.6px;
		color: black;
		margin-bottom: 12px;
	}

	.description {
		font-size: 14px;
		line-height: 21px;
	}
}

.footer {
	padding-top: 15px;

	.el-button {
		float: right;
	}
}
</style>