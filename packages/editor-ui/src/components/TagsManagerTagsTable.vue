<template>
	<div
		@keyup.enter="applyOperation()"
		@keyup.esc="cancelOperation()"
	>
		<el-row class="tags-header">
			<el-col :span="10">
				<el-input placeholder="Search tags" v-model="search" :disabled="isHeaderDisabled()" :clearable="true" :maxlength="maxLength">
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
		<el-table 
			stripe
			max-height="450"
			ref="table"
			empty-text="No matching tags exist"
			:data="rows"
			:span-method="getSpan"
			:row-class-name="getRowClasses"
			v-loading="isLoading"
		>
			<el-table-column label="Name">
				<template slot-scope="scope">
					<div class="name" :key="scope.row.id">
						<transition name="fade" mode="out-in">
							<el-input 
								v-if="scope.row.create || scope.row.update"
								v-model="newTagName"
								:maxlength="maxLength"
								ref="nameInput"
							></el-input>
							<span v-else-if="scope.row.delete">Are you sure you want to delete this tag?</span>
							<span v-else :class="scope.row.disable? 'disabled': ''">
								{{scope.row.tag.name}}
							</span>
						</transition>
					</div>
				</template>
			</el-table-column>
			<el-table-column label="Usage">
					<template slot-scope="scope">
						<transition name="fade" mode="out-in">
							<div v-if="!scope.row.create && !scope.row.delete" :class="scope.row.disable? 'disabled': ''">
								{{scope.row.usage}}
							</div>
						</transition>
					</template>
			</el-table-column>
			<el-table-column
				width="200">
				<template slot-scope="scope">
					<transition name="fade" mode="out-in">
						<div class="ops" v-if="scope.row.create">
							<el-button title="Cancel" @click.stop="disableCreate()" size="small" plain :disabled="isSaving">Cancel</el-button>
							<el-button title="Create Tag" @click.stop="createTag()" size="small" :loading="isSaving">
								Create tag
							</el-button>
							
						</div>
						<div class="ops" v-else-if="scope.row.update">
							<el-button title="Cancel" @click.stop="disableUpdate()" size="small" plain :disabled="isSaving">Cancel</el-button>
							<el-button title="Save Tag" @click.stop="updateTag(scope.row)" size="small" :loading="isSaving">Save changes</el-button>
						</div>
						<div class="ops" v-else-if="scope.row.delete">
							<el-button title="Cancel" @click.stop="disableDelete()" size="small" plain :disabled="isSaving">Cancel</el-button>
							<el-button title="Delete Tag" @click.stop="deleteTag(scope.row)" size="small" :loading="isSaving">Delete tag</el-button>
						</div>
						<div class="ops main" v-else-if="!scope.row.disable">
							<el-button title="Delete Tag" @click.stop="enableDelete(scope.row)" icon="el-icon-delete" circle></el-button>
							<el-button title="Edit Tag" @click.stop="enableUpdate(scope.row)" icon="el-icon-edit" circle></el-button>
						</div>
					</transition>
				</template>
			</el-table-column>
		</el-table>
		<input ref="deleteHiddenInput" class="hidden"/>
	</div>
</template>

<script lang="ts">
import { MAX_TAG_NAME_LENGTH } from '@/constants';
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

const INPUT_TRANSITION_TIMEOUT = 300;
const DELETE_TRANSITION_TIMEOUT = 100;

export default Vue.extend({
	name: 'TagsTable',
	props: [
		'tags',
		'isLoading',
	],
	data() {
		return {
			createEnabled: false,
			deleteId: '',
			updateId: '',
			searchValue: '',
			newTagName: '',
			stickyIds: new Set(),
			maxLength: MAX_TAG_NAME_LENGTH,
			isSaving: false,
		};
	},
	mounted() {
		if (this.$props.tags.length === 0) {
			this.focusOnInput();
		}
	},
	computed: {
		isCreateEnabled(): boolean {
			return this.$props.tags.length === 0 || this.createEnabled;
		},
		rows(): ITagRow[] {
			const filter = this.search;
			const tagRows = this.tags
				.filter((tag: ITag) => this.stickyIds.has(tag.id) || tag.name.toLowerCase().trim().includes(filter.toLowerCase().trim() || ''))
				.map((tag: ITag): ITagRow => ({
					tag,
					usage: tag.usageCount && tag.usageCount > 0 ? `${tag.usageCount} workflow${tag.usageCount > 1 ? 's' : ''}` : 'Not being used',
					disable: this.isTagDisabled(tag.id),
					update: this.isUpdateEnabled(tag.id),
					delete: this.isDeleteEnabled(tag.id),
				}));

			return this.isCreateEnabled || this.tags.length === 0 ? [{create: true}, ...tagRows] : tagRows;
		},
		search: {
			get(): string {
				return this.$data.searchValue;
			},
			set(search: string) {
				this.stickyIds.clear();
				this.$data.searchValue = search;
			},
		},
	},
	methods: {
		getRowClasses: ({row}: {row: ITagRow}): string => {
			return row.disable ? 'disabled' : '';
		},
		getSpan({row, columnIndex}: {row: ITagRow, columnIndex: number}): number | number[] {
			// expand text column with delete message
			if (columnIndex === 0 && row.tag && this.isDeleteEnabled(row.tag.id)) {
				return [1, 2];
			}
			// hide usage column on delete
			if (columnIndex === 1 && row.tag && this.isDeleteEnabled(row.tag.id)) {
				return [0, 0];
			}

			return 1;
		},
		isUpdateEnabled(tagId: string): boolean {
			return !this.isCreateEnabled && !!this.$data.updateId && tagId === this.$data.updateId;
		},
		isDeleteEnabled(tagId: string): boolean {
			return !this.isCreateEnabled && !!this.$data.deleteId && tagId === this.$data.deleteId;
		},
		isTagDisabled(tagId: string): boolean {
			if (this.$data.updateId && tagId !== this.$data.updateId) {
				return true;
			}

			if (this.$data.deleteId && tagId !== this.$data.deleteId) {
				return true;
			}

			return this.isCreateEnabled;
		},
		isHeaderDisabled(): boolean {
			return this.$props.isLoading || !!(this.isCreateEnabled || this.$data.updateId || this.$data.deleteId);
		},
		focusOnInput(): void {
			setTimeout(() => {
				const input = this.$refs.nameInput as any; // tslint:disable-line:no-any
				if (input && input.focus) {
					input.focus();
				}
			}, INPUT_TRANSITION_TIMEOUT);
		},

		enableUpdate(row: ITagRow): void {
			if (row.tag) {
				this.updateId = row.tag.id;
				this.newTagName = row.tag.name;
				this.focusOnInput();
			}
		},
		disableUpdate(): void {
			this.updateId = '';
			this.newTagName = '';
		},
		updateTag(row: ITagRow): void {
			if (row.tag) {
				this.$data.isSaving = true;
				const updateId = row.tag.id;
				this.$emit('onUpdate', updateId, this.$data.newTagName.trim(), row.tag.name, (updated: boolean) => {
					this.$data.isSaving = false;
					if (updated) {
						this.stickyIds.add(updateId);
						this.disableUpdate();
					}
				});
			}
		},

		enableDelete(row: ITagRow): void {
			if (row.tag) {
				this.deleteId = row.tag.id;

				setTimeout(() => {
					const input = this.$refs.deleteHiddenInput as any; // tslint:disable-line:no-any
					if (input && input.focus) {
						input.focus();
					}
				}, DELETE_TRANSITION_TIMEOUT);
			}
		},
		disableDelete(): void {
			this.deleteId = '';
		},
		deleteTag(row: ITagRow): void {
			if (row.tag) {
				this.$data.isSaving = true;
				this.$emit('onDelete', row.tag.id, row.tag.name, (deleted: boolean) => {
					if (deleted) {
						this.disableDelete();
					}
					this.$data.isSaving = false;
				});
			}
		},


		enableCreate(): void {
			this.$data.createEnabled = true;
			this.$data.newTagName = '';
			((this.$refs.table as Vue).$refs.bodyWrapper as Element).scrollTop = 0;
			this.focusOnInput();
		},
		disableCreate(): void {
			this.$data.createEnabled = false;
			this.$emit('disableCreate');
		},
		createTag(): void {
			this.$data.isSaving = true;
			this.$emit('onCreate', this.$data.newTagName.trim(), (created: ITag | null, error?: Error) => {
				if (created) {
					this.stickyIds.add(created.id);
					this.disableCreate();
				}
				this.$data.isSaving = false;
			});
		},

		applyOperation(): void {
			if (this.$data.isSaving) {
				return;
			}

			if (this.isCreateEnabled) {
				this.createTag();

				return;
			}

			if (this.$data.updateId) {
				const row = this.rows.find((row) => row.tag && row.tag.id === this.$data.updateId);

				if (row) {
					this.updateTag(row);
				}

				return;
			}

			if (this.$data.deleteId) {
				const row = this.rows.find((row) => row.tag && row.tag.id === this.$data.deleteId);

				if (row) {
					this.deleteTag(row);
				}

				return;
			}
		},
		cancelOperation(): void {
			if (this.$data.isSaving ) {
				return;
			}

			if (this.isCreateEnabled) {
				this.disableCreate();

				return;
			}

			if (this.$data.updateId) {
				this.disableUpdate();

				return;
			}

			if (this.$data.deleteId) {
				this.disableDelete();

				return;
			}
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

.hidden {
	position:absolute;
	z-index:0;
	opacity:0;
	filter:alpha(opacity=0);
}

.ops.main > .el-button {
	display: none;
	float: right;
	margin-left: 5px;
}

/deep/ tr.disabled {
	pointer-events: none;
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

.fade-enter-active, .fade-leave-active {
  transition: opacity .2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

</style>