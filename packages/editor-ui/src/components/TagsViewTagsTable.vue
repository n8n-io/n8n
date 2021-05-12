<template>
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
				<div class="name" :key="scope.row.id" @keydown.stop>
					<transition name="fade" mode="out-in">
						<el-input
							v-if="scope.row.create || scope.row.update"
							:value="newName"
							:maxlength="maxLength"
							@input="onNewNameChange"
							ref="nameInput"
						></el-input>
						<span v-else-if="scope.row.delete">
							<span>Are you sure you want to delete this tag?</span>
							<input ref="deleteHiddenInput" class="hidden" />
						</span>
						<span v-else :class="{ disabled: scope.row.disable }">
							{{ scope.row.tag.name }}
						</span>
					</transition>
				</div>
			</template>
		</el-table-column>
		<el-table-column label="Usage" width="150">
			<template slot-scope="scope">
				<transition name="fade" mode="out-in">
						<div v-if="!scope.row.create && !scope.row.delete" :class="{ disabled: scope.row.disable }">
							{{ scope.row.usage }}
						</div>
					</transition>
				</template>
		</el-table-column>
		<el-table-column>
			<template slot-scope="scope">
				<transition name="fade" mode="out-in">
					<div class="ops" v-if="scope.row.create">
						<el-button title="Cancel" @click.stop="cancel" size="small" plain :disabled="isSaving">Cancel</el-button>
						<el-button title="Create Tag" @click.stop="apply" size="small" :loading="isSaving">
							Create tag
						</el-button>
					</div>
					<div class="ops" v-else-if="scope.row.update">
						<el-button title="Cancel" @click.stop="cancel" size="small" plain :disabled="isSaving">Cancel</el-button>
						<el-button title="Save Tag" @click.stop="apply" size="small" :loading="isSaving">Save changes</el-button>
					</div>
					<div class="ops" v-else-if="scope.row.delete">
						<el-button title="Cancel" @click.stop="cancel" size="small" plain :disabled="isSaving">Cancel</el-button>
						<el-button title="Delete Tag" @click.stop="apply" size="small" :loading="isSaving">Delete tag</el-button>
					</div>
					<div class="ops main" v-else-if="!scope.row.disable">
						<el-button title="Edit Tag" @click.stop="enableUpdate(scope.row)" icon="el-icon-edit" circle></el-button>
						<el-button title="Delete Tag" @click.stop="enableDelete(scope.row)" icon="el-icon-delete" circle></el-button>
					</div>
				</transition>
			</template>
		</el-table-column>
	</el-table>
</template>

<script lang="ts">
import { MAX_TAG_NAME_LENGTH } from "@/constants";
import { ITagRow } from "@/Interface";
import Vue from "vue";

const INPUT_TRANSITION_TIMEOUT = 350;
const DELETE_TRANSITION_TIMEOUT = 100;

export default Vue.extend({
	name: "TagsTable",
	props: ["rows", "isLoading", "newName", "isSaving"],
	data() {
		return {
			maxLength: MAX_TAG_NAME_LENGTH,
		};
	},
	mounted() {
		if (this.$props.rows.length === 1 && this.$props.rows[0].create) {
			this.focusOnInput();
		}
	},
	methods: {
		getRowClasses: ({ row }: { row: ITagRow }): string => {
			return row.disable ? "disabled" : "";
		},

		getSpan({ row, columnIndex }: { row: ITagRow, columnIndex: number }): number | number[] {
			// expand text column with delete message
			if (columnIndex === 0 && row.tag && row.delete) {
				return [1, 2];
			}
			// hide usage column on delete
			if (columnIndex === 1 && row.tag && row.delete) {
				return [0, 0];
			}

			return 1;
		},

		enableUpdate(row: ITagRow): void {
			if (row.tag) {
				this.$emit('updateEnable', row.tag.id);
				this.$emit('newNameChange', row.tag.name);
				this.focusOnInput();
			}
		},

		enableDelete(row: ITagRow): void {
			if (row.tag) {
				this.$emit('deleteEnable', row.tag.id);
				this.focusOnDelete();
			}
		},

		cancel(): void {
			this.$emit('cancelOperation');
		},
		apply(): void {
			this.$emit('applyOperation');
		},

		onNewNameChange(name: string): void {
			this.$emit('newNameChange', name);
		},

		focusOnInput(): void {
			setTimeout(() => {
				const input = this.$refs.nameInput as any; // tslint:disable-line:no-any
				if (input && input.focus) {
					input.focus();
				}
			}, INPUT_TRANSITION_TIMEOUT);
		},

		focusOnDelete(): void {
			setTimeout(() => {
				const input = this.$refs.deleteHiddenInput as any; // tslint:disable-line:no-any
				if (input && input.focus) {
					input.focus();
				}
			}, DELETE_TRANSITION_TIMEOUT);
		},

		focusOnCreate(): void {
			((this.$refs.table as Vue).$refs.bodyWrapper as Element).scrollTop = 0;
			this.focusOnInput();
		},
	},
	watch: {
		rows(newValue: ITagRow[] | undefined) {
			if (newValue && newValue[0] && newValue[0].create) {
				this.focusOnCreate();
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
	justify-content: flex-end;
	align-items: center;
	display: flex;
	flex-wrap: nowrap;

	> .el-button {
		margin: 2px;
	}
}

.disabled {
	color: #afafaf;
}

.hidden {
	position: absolute;
	z-index: 0;
	opacity: 0;
}

.ops.main > .el-button {
	display: none;
	float: right;
	margin-left: 2px;
}

/deep/ tr.disabled {
	pointer-events: none;
}

/deep/ tr:hover .ops:not(.disabled) .el-button {
	display: block;
}

/deep/ .el-input.is-disabled > input {
	border: none;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s;
}
.fade-enter,
.fade-leave-to {
	opacity: 0;
}
</style>