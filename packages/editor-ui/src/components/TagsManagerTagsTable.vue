<template>
	<el-row>
		<el-row class="tags-header">
			<el-col :span="10">
				<el-input placeholder="Search tags" v-model="search" :disabled="isHeaderDisabled()">
					<i slot="prefix" class="el-input__icon el-icon-search"></i>
				</el-input>
			</el-col>
			<el-col :span="14">
				<el-button @click="enableCreate" :disabled="isHeaderDisabled()" plain>
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
						<el-input 
							v-if="scope.row.create || scope.row.update"
							v-model="newTagName"
							:maxlength="24"
						></el-input>
						<span v-else-if="scope.row.delete">Are you sure you want to delete this tag?</span>
						<span v-else :class="scope.row.disable? 'disabled': ''">
							{{scope.row.tag.name}}
						</span>
					</div>
				</template>
			</el-table-column>
			<el-table-column label="Usage">
					<template slot-scope="scope">
						<div v-if="!scope.row.create && !scope.row.delete" :class="scope.row.disable? 'disabled': ''">
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
					<div class="ops" v-else-if="scope.row.update">
						<el-button title="Cancel" @click.stop="disableUpdate()" size="small" plain>Cancel</el-button>
						<el-button title="Save Tag" @click.stop="updateTag(scope.row)" size="small">Save changes</el-button>
					</div>
					<div class="ops" v-else-if="scope.row.delete">
						<el-button title="Cancel" @click.stop="disableDelete()" size="small" plain>Cancel</el-button>
						<el-button title="Delete Tag" @click.stop="deleteTag(scope.row)" size="small">Delete tag</el-button>
					</div>
					<div class="ops main" v-else-if="!scope.row.disable">
						<el-button title="Delete Tag" @click.stop="enableDelete(scope.row)" icon="el-icon-delete" circle></el-button>
						<el-button title="Edit Tag" @click.stop="enableUpdate(scope.row)" icon="el-icon-edit" circle></el-button>
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
	disable?: boolean;
	update?: boolean;
	delete?: boolean;
}

export default Vue.extend({
	name: 'TagsTable',
	props: [
		'tags',
		'isCreateEnabled',
		'deleteId',
		'updateId',
	],
	data() {
		return {
			_search: '',
			newTagName: '',
			stickyIds: new Set(),
		};
	},
	computed: {
		rows(): ITagRow[] {
			const tagRows = [...this.$store.getters['tags/allTags']]
				.filter((tag: ITag) => tag && (this.stickyIds.has(tag.id) || tag.name.toLowerCase().trim().includes(this.$data._search.toLowerCase().trim() || '')))
				.map((tag: ITag): ITagRow => ({
					tag,
					usage: tag.usageCount > 0 ? `${tag.usageCount} workflow${tag.usageCount > 1 ? 's' : ''}` : 'Not being used',
					disable: this.isTagDisabled(`${tag.id}`),
					update: this.isUpdateEnabled(`${tag.id}`),
					delete: this.isDeleteEnabled(`${tag.id}`),
				}));

			return this.$props.isCreateEnabled ? [{create: true}, ...tagRows] : tagRows;
		},
		search: {
			get(): string {
				return this.$data._search;
			},
			set(search: string) {
				this.stickyIds.clear();
				this.$data._search = search;
			}
		}
	},
	methods: {
		getSpan({row, columnIndex}: {row: ITagRow, columnIndex: number}): number | number[] {
			// expand text column with delete message
			if (columnIndex === 0 && row.tag && this.isDeleteEnabled(`${row.tag.id}`)) {
				return [1, 2];
			}
			// hide usage column on delete
			if (columnIndex === 1 && row.tag && this.isDeleteEnabled(`${row.tag.id}`)) {
				return [0, 0];
			}

			return 1;
		},
		isUpdateEnabled(tagId: string): boolean {
			return !this.$props.isCreateEnabled && !!this.$props.updateId && tagId === this.$props.updateId;
		},
		isDeleteEnabled(tagId: string): boolean {
			return !this.$props.isCreateEnabled && !!this.$props.deleteId && tagId === this.$props.deleteId;
		},
		isTagDisabled(tagId: string): boolean {
			if (this.$props.updateId && tagId !== this.$props.updateId) {
				return true;
			}

			if (this.$props.deleteId && tagId !== this.$props.deleteId) {
				return true;
			}

			return this.$props.isCreateEnabled;
		},
		isHeaderDisabled(): boolean {
			return !!(this.$props.isCreateEnabled || this.$props.updateId || this.$props.deleteId);
		},

		enableUpdate(row: ITagRow): void {
			if (row.tag) {
				this.$emit('enableUpdate', row.tag.id);
				this.newTagName = row.tag.name;
			}
		},
		disableUpdate(): void {
			this.$emit('disableUpdate');
			this.newTagName = '';
		},
		updateTag(row: ITagRow): void {
			row.tag && this.$emit('onUpdate', row.tag.id, this.$data.newTagName, row.tag.name);
		},

		enableDelete(row: ITagRow): void {
			row.tag && this.$emit('enableDelete', row.tag.id);
		},
		disableDelete(): void {
			this.$emit('disableDelete');
		},
		deleteTag(row: ITagRow): void {
			row.tag && this.$emit('onDelete', row.tag.id, row.tag.name);
		},

		enableCreate(): void {
			this.$emit('enableCreate');
			((this.$refs.table as Vue).$refs.bodyWrapper as Element).scrollTop = 0;
		},
		disableCreate(): void {
			this.$emit('disableCreate');
		},
		createTag(): void {
			this.$emit('onCreate', this.$data.newTagName, (createdId: string) => this.stickyIds.add(createdId));
		},
	},
	watch: {
		isCreateEnabled() {
			this.$data.newTagName = '';
		},
		updateId(newValue, oldValue) {
			// on update, keep updated items in view despite filter
			if (!newValue && oldValue) {
				this.stickyIds.add(oldValue);
			}
		}
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