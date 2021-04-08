<template>
	<el-table :data="rows" :default-sort="{prop: 'name', order: 'ascending'}" stripe max-height="450">
		<el-table-column property="name" label="Name">
			<template slot-scope="scope">
				<el-input v-if="scope.row.create"></el-input>
				<span>
					{{scope.row.name}}
				</span>
			</template>
		</el-table-column>
		<el-table-column property="usage" label="Usage">
				<template slot-scope="scope">
					<div v-if="!scope.row.create">
						{{scope.row.usage}}
					</div>
				</template>
		</el-table-column>
		<el-table-column
			width="200">
			<template slot-scope="scope">
				<div class="ops" v-if="scope.row.create">
					<el-button title="Cancel" @click.stop="cancelCreate()" size="small" plain>Cancel</el-button>
					<el-button title="Create Tag" @click.stop="createTag()" size="small">Create tag</el-button>
				</div>
				<div class="ops" v-else-if="scope.row.edit">
					<el-button title="Cancel" @click.stop="cancelEdit(scope.row.tag.id)" size="small" plain>Cancel</el-button>
					<el-button title="Save Tag" @click.stop="saveTag()" size="small">Save changes</el-button>
				</div>
				<div class="ops" v-else-if="scope.row.delete">
					<el-button title="Cancel" @click.stop="cancelDelete(scope.row.tag.id)" size="small" plain>Cancel</el-button>
					<el-button title="Delete Tag" @click.stop="deleteTag(scope.row.tag.id)" size="small">Delete tag</el-button>
				</div>
				<div class="ops main" v-else>
					<el-button title="Delete Tag" @click.stop="deleteTag(scope.row.tag.id)" icon="el-icon-delete" circle></el-button>
					<el-button title="Edit Tag" @click.stop="editTag(scope.row.tag.id)" icon="el-icon-edit" circle></el-button>
				</div>
			</template>
		</el-table-column>
	</el-table>
</template>

<script lang="ts">
import { ITag } from '@/Interface';
import Vue from 'vue';

interface ITagRow {
	name?: string;
	tag?: ITag;
	create?: boolean;
	edit?: boolean;
	delete?: boolean;
	disabled?: boolean;
};

export default Vue.extend({
	name: 'TagsTable',
	props: [
		'tags',
		'search',
		'isCreateEnabled'
	],
	data() {
		const tags = this.$store.getters['tags/allTags']
			.map((t: ITag) => ({
				tag: t,
				name: t.name,
				usage: t.usageCount > 0 ? `${t.usageCount} workflow${t.usageCount > 1 ? 's' : ''}` : 'Not being used',
				edit: false,
				delete: false,
				disabled: false
			}));

		return {
			tags
		};
	},
	computed: {
		rows(): ITagRow[] {
			return this.isCreateEnabled? [{create: true, name: '', usage: ''}, ...this.$data.tags]: this.$data.tags;
		},
	},
	methods: {
		disableAllTags() {
			// this.$data.tags = this.$data.tags.map(
		},
		enableAllTags() {

		},
		editTag(id: string): void {
			const current = this.$data.tags.find();

			current.edit = true;
		},
		cancelCreate(): void {
			this.$emit('cancelCreate');
		}
	}
});
</script>

<style lang="scss" scoped>
/deep/ .el-input {
	input {
		border: 1px solid $--color-primary;
	}
}

.ops {
	min-height: 45px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.disabled {
	color: #606266;
}

.ops.main .el-button {
	display: none;
	float: right;
	margin-left: 5px;
}

/deep/ tr {
	&:hover .ops:not(.disabled) .el-button {
		display: block;
	}
}
</style>