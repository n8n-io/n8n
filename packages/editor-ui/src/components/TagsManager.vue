<template>
	<el-dialog title="Manage Tags" :visible.sync="visible">
		<el-row class="content">
			<TagsTable v-if="hasTags || isCreateEnabled"
					:tags="tags"
					:isCreateEnabled="isCreateEnabled"
					@enableCreate="enableCreate"
					@disableCreate="disableCreate"
					@onCreate="onCreate"
					@onUpdate="onUpdate"
					@onDelete="onDelete"
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
		<el-row class="footer">
			<el-button size="small">Done</el-button>
		</el-row>
	</el-dialog>
</template>

<script lang="ts">
import { ITag } from '@/Interface';
import Vue from 'vue';

import TagsTable from '@/components/TagsManagerTagsTable.vue';

export default Vue.extend({
	name: 'TagsManager',
	props: [
		'visible',
	],
	created() {
    	this.$store.dispatch('tags/getAll');
	},
	data() {
		return {
			isCreateEnabled: false,
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
		onCreate(name: string) {
			this.$store.dispatch('tags/addNew', name);
		},
		onUpdate(id: number, name: string) {
			this.$store.dispatch('tags/rename', {id, name});
		},
		onDelete(id: number) {
			this.$store.dispatch('tags/delete', id);
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