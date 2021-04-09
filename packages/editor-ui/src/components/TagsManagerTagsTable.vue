<template>
	<el-table :data="rows" stripe max-height="450" :span-method="getSpan">
		<el-table-column label="Name">
			<template slot-scope="scope">
				<div class="name">
					<el-input v-if="scope.row.create"></el-input>
					<el-input v-else-if="isEditEnabled(scope.row)" :value="scope.row.tag.name"></el-input>
					<span v-else-if="isDeleteEnabled(scope.row)">Are you sure you want to delete this tag?</span>
					<span v-else :class="isDisabled(scope.row)? 'disabled': ''">
						{{scope.row.tag.name}}
					</span>
				</div>
			</template>
		</el-table-column>
		<el-table-column label="Usage">
				<template slot-scope="scope">
					<div v-if="!scope.row.create && !isDeleteEnabled(scope.row)" :class="isDisabled(scope.row)? 'disabled': ''">
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
				<div class="ops" v-else-if="isEditEnabled(scope.row)">
					<el-button title="Cancel" @click.stop="cancelEdit()" size="small" plain>Cancel</el-button>
					<el-button title="Save Tag" @click.stop="saveTag()" size="small">Save changes</el-button>
				</div>
				<div class="ops" v-else-if="isDeleteEnabled(scope.row)">
					<el-button title="Cancel" @click.stop="cancelDelete()" size="small" plain>Cancel</el-button>
					<el-button title="Delete Tag" @click.stop="deleteTag(scope.row)" size="small">Delete tag</el-button>
				</div>
				<div class="ops main" v-else-if="!isDisabled(scope.row)">
					<el-button title="Delete Tag" @click.stop="deleteTag(scope.row)" icon="el-icon-delete" circle></el-button>
					<el-button title="Edit Tag" @click.stop="editTag(scope.row)" icon="el-icon-edit" circle></el-button>
				</div>
			</template>
		</el-table-column>
	</el-table>
</template>

<script lang="ts">
import { ITag } from '@/Interface';
import { ElTableColumn } from 'element-ui/types/table-column';
import Vue from 'vue';

interface ITagRow {
	tag?: ITag;
	usage?: string;
	create?: boolean;
};

export default Vue.extend({
	name: 'TagsTable',
	props: [
		'tags',
		'search',
		'create'
	],
	data() {
		const tagRows = [...this.$store.getters['tags/allTags']]
			.sort((a: ITag, b: ITag) => a.name.localeCompare(b.name))
			.map((t: ITag): ITagRow => ({
				tag: t,
				usage: t.usageCount > 0 ? `${t.usageCount} workflow${t.usageCount > 1 ? 's' : ''}` : 'Not being used'
			}));


		return {
			tagRows,
			deleteId: '',
			editId: ''
		};
	},
	computed: {
		rows: function() {
			return this.$props.create ? [{create: true}].concat(this.$data.tagRows) : this.$data.tagRows;
		}
	},
	methods: {
		getSpan({row, columnIndex}: {row: ITagRow, columnIndex: number}) {
			if (columnIndex === 0 && this.isDeleteEnabled(row)) {
				return [1, 2];
			}
			if (columnIndex === 1 && this.isDeleteEnabled(row)) {
				return [0, 0];
			}

			return 1;
		},
		isEditEnabled(row: ITagRow): boolean {
			return this.$data.editId && row.tag && row.tag.id === this.$data.editId;
		},
		isDeleteEnabled(row: ITagRow): boolean {
			return this.$data.deleteId && row.tag && row.tag.id === this.$data.deleteId;
		},
		isDisabled(row: ITagRow): boolean {
			if (this.$data.editId && row.tag && row.tag.id !== this.$data.editId) {
				return true;
			}

			if (this.$data.deleteId && row.tag && row.tag.id !== this.$data.deleteId) {
				return true;
			}

			return this.$props.create;
		},
		editTag(row: ITagRow): void {
			this.editId = (row.tag && row.tag.id) || '';
			this.$emit('cancelCreate');
		},
		cancelEdit(): void {
			this.editId = '';
		},
		cancelDelete(): void {
			this.deleteId = '';
			this.$emit('cancelCreate');
		},
		deleteTag(row: ITagRow): void {
			this.deleteId = (row.tag && row.tag.id) || '';
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

.name {
	min-height: 45px;
	display: flex;
	align-items: center;
}

.ops {
	min-height: 45px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.disabled {
	color: #afafaf;
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