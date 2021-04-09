<template>
	<el-row>
		<el-row class="tags-header">
			<el-col :span="10">
				<el-input placeholder="Search tags" v-model="search" :disabled="isDisabled()">
					<i slot="prefix" class="el-input__icon el-icon-search"></i>
				</el-input>
			</el-col>
			<el-col :span="14">
				<el-button @click="enableCreate" :disabled="isDisabled()" plain>
					<font-awesome-icon icon="plus" />
					<div class="next-icon-text">
						Add new
					</div>
				</el-button>
			</el-col>
		</el-row>
		<el-table :data="rows" stripe max-height="450" :span-method="getSpan" ref="table">
			<el-table-column label="Name">
				<template slot-scope="scope">
					<div class="name">
						<el-input v-if="scope.row.create || isEditEnabled(scope.row)" :value="scope.row.tag.name"></el-input>
						<span v-else-if="isDeleteEnabled(scope.row)">Are you sure you want to delete this tag?</span>
						<span v-else :class="isRowDisabled(scope.row)? 'disabled': ''">
							{{scope.row.tag.name}}
						</span>
					</div>
				</template>
			</el-table-column>
			<el-table-column label="Usage">
					<template slot-scope="scope">
						<div v-if="!scope.row.create && !isDeleteEnabled(scope.row)" :class="isRowDisabled(scope.row)? 'disabled': ''">
							{{scope.row.usage}}
						</div>
					</template>
			</el-table-column>
			<el-table-column
				width="200">
				<template slot-scope="scope">
					<div class="ops" v-if="scope.row.create">
						<el-button title="Cancel" @click.stop="disableCreate()" size="small" plain>Cancel</el-button>
						<el-button title="Create Tag" @click.stop="createTag()" size="small">Create tag</el-button>
					</div>
					<div class="ops" v-else-if="isEditEnabled(scope.row)">
						<el-button title="Cancel" @click.stop="disableEdit()" size="small" plain>Cancel</el-button>
						<el-button title="Save Tag" @click.stop="updateTag()" size="small">Save changes</el-button>
					</div>
					<div class="ops" v-else-if="isDeleteEnabled(scope.row)">
						<el-button title="Cancel" @click.stop="disableDelete()" size="small" plain>Cancel</el-button>
						<el-button title="Delete Tag" @click.stop="deleteTag(scope.row)" size="small">Delete tag</el-button>
					</div>
					<div class="ops main" v-else-if="!isRowDisabled(scope.row)">
						<el-button title="Delete Tag" @click.stop="enableDelete(scope.row)" icon="el-icon-delete" circle></el-button>
						<el-button title="Edit Tag" @click.stop="enableEdit(scope.row)" icon="el-icon-edit" circle></el-button>
					</div>
				</template>
			</el-table-column>
		</el-table>
	</el-row>
</template>

<script lang="ts">
import { ITag } from '@/Interface';
import Vue from 'vue';

interface ITagRow {
	tag?: ITag;
	usage?: string;
	create?: boolean;
}

export default Vue.extend({
	name: 'TagsTable',
	props: [
		'tags',
		'isCreateEnabled',
	],
	data() {
		const tagRows = [...this.$store.getters['tags/allTags']]
			.sort((a: ITag, b: ITag) => a.name.localeCompare(b.name))
			.map((t: ITag): ITagRow => ({
				tag: t,
				usage: t.usageCount > 0 ? `${t.usageCount} workflow${t.usageCount > 1 ? 's' : ''}` : 'Not being used',
			}));


		return {
			tagRows,
			search: '',
			deleteId: '',
			editId: '',
		};
	},
	computed: {
		rows() {
			const tagRows = this.$data.tagRows
				.filter((row: ITagRow) => row.tag && row.tag.name.toLowerCase().trim().includes(this.$data.search.toLowerCase().trim() || ''));

			return this.$props.isCreateEnabled ? [{create: true, tag: {name: ''}}].concat(tagRows) : tagRows;
		},
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
			return !this.$props.isCreateEnabled && !!this.$data.editId && !!row.tag && row.tag.id === this.$data.editId;
		},
		isDeleteEnabled(row: ITagRow): boolean {
			return !this.$props.isCreateEnabled && !!this.$data.deleteId && !!row.tag && row.tag.id === this.$data.deleteId;
		},
		isRowDisabled(row: ITagRow): boolean {
			if (this.$data.editId && row.tag && row.tag.id !== this.$data.editId) {
				return true;
			}

			if (this.$data.deleteId && row.tag && row.tag.id !== this.$data.deleteId) {
				return true;
			}

			return this.$props.isCreateEnabled;
		},
		isDisabled(): boolean {
			return !!(this.$props.isCreateEnabled || this.$data.editId || this.$data.deleteId);
		},
		enableEdit(row: ITagRow): void {
			this.editId = row.tag? `${row.tag.id}` : '';
		},
		disableEdit(): void {
			this.editId = '';
		},
		updateTag(row: ITagRow): void {
			row.tag && this.$emit('onUpdate', row.tag.id, row.tag.name);
		},
		enableDelete(row: ITagRow): void {
			this.deleteId = row.tag ? `${row.tag.id}` : '';
		},
		disableDelete(): void {
			this.deleteId = '';
		},
		deleteTag(row: ITagRow): void {
			row.tag && this.$emit('onDelete', row.tag.id);
		},
		enableCreate(): void {
			this.$emit('enableCreate');
			((this.$refs.table as Vue).$refs.bodyWrapper as Element).scrollTop = 0;
		},
		disableCreate(): void {
			this.$emit('disableCreate');
		},
		createTag(row: ITagRow): void {
			row.tag && this.$emit('onCreate', row.tag.name);
		},
	},
	watch: {
		isCreateEnabled() {
			this.$data.deleteId = '';
			this.$data.editId = '';
		},
	},
});
</script>

<style lang="scss" scoped>
.name {
	min-height: 45px;
	display: flex;
	align-items: center;

	/deep/ input {
		border: 1px solid $--color-primary;
		background: white;
	}
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

.ops.main > .el-button {
	display: none;
	float: right;
	margin-left: 5px;
}

/deep/ tr:hover .ops:not(.disabled) .el-button {
	display: block;
}

.tags-header {
	margin-bottom: 15px;

	.el-button {
		float: right;
	}
}

/deep/ .el-input.is-disabled > input {
	border: none;
}

</style>