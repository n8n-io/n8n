<template>
	<el-table
		ref="table"
		v-loading="isLoading"
		class="tags-table"
		stripe
		max-height="450"
		:empty-text="$locale.baseText('tagsTable.noMatchingTagsExist')"
		:data="rows"
		:span-method="getSpan"
		:row-class-name="getRowClasses"
	>
		<el-table-column :label="$locale.baseText('tagsTable.name')">
			<template #default="scope">
				<div :key="scope.row.id" class="name" @keydown.stop>
					<transition name="fade" mode="out-in">
						<n8n-input
							v-if="scope.row.create || scope.row.update"
							ref="nameInput"
							:model-value="newName"
							:maxlength="maxLength"
							@update:model-value="onNewNameChange"
						></n8n-input>
						<span v-else-if="scope.row.delete">
							<span>{{ $locale.baseText('tagsTable.areYouSureYouWantToDeleteThisTag') }}</span>
							<input ref="deleteHiddenInput" class="hidden" />
						</span>
						<span v-else :class="{ disabled: scope.row.disable }">
							{{ scope.row.tag.name }}
						</span>
					</transition>
				</div>
			</template>
		</el-table-column>
		<el-table-column :label="$locale.baseText('tagsTable.usage')" width="150">
			<template #default="scope">
				<transition name="fade" mode="out-in">
					<div
						v-if="!scope.row.create && !scope.row.delete"
						:class="{ disabled: scope.row.disable }"
					>
						{{ scope.row.usage }}
					</div>
				</transition>
			</template>
		</el-table-column>
		<el-table-column>
			<template #default="scope">
				<transition name="fade" mode="out-in">
					<div v-if="scope.row.create" class="ops">
						<n8n-button
							:label="$locale.baseText('tagsTable.cancel')"
							type="secondary"
							:disabled="isSaving"
							@click.stop="cancel"
						/>
						<n8n-button
							:label="$locale.baseText('tagsTable.createTag')"
							:loading="isSaving"
							@click.stop="apply"
						/>
					</div>
					<div v-else-if="scope.row.update" class="ops">
						<n8n-button
							:label="$locale.baseText('tagsTable.cancel')"
							type="secondary"
							:disabled="isSaving"
							@click.stop="cancel"
						/>
						<n8n-button
							:label="$locale.baseText('tagsTable.saveChanges')"
							:loading="isSaving"
							@click.stop="apply"
						/>
					</div>
					<div v-else-if="scope.row.delete" class="ops">
						<n8n-button
							:label="$locale.baseText('tagsTable.cancel')"
							type="secondary"
							:disabled="isSaving"
							@click.stop="cancel"
						/>
						<n8n-button
							:label="$locale.baseText('tagsTable.deleteTag')"
							:loading="isSaving"
							@click.stop="apply"
						/>
					</div>
					<div v-else-if="!scope.row.disable" class="ops main">
						<n8n-icon-button
							:title="$locale.baseText('tagsTable.editTag')"
							icon="pen"
							data-test-id="edit-tag-button"
							@click.stop="enableUpdate(scope.row)"
						/>
						<n8n-icon-button
							v-if="scope.row.canDelete"
							:title="$locale.baseText('tagsTable.deleteTag')"
							icon="trash"
							data-test-id="delete-tag-button"
							@click.stop="enableDelete(scope.row)"
						/>
					</div>
				</transition>
			</template>
		</el-table-column>
	</el-table>
</template>

<script lang="ts">
import type { ElTable } from 'element-plus';
import { MAX_TAG_NAME_LENGTH } from '@/constants';
import type { ITagRow } from '@/Interface';
import { defineComponent } from 'vue';
import type { N8nInput } from 'n8n-design-system';

type TableRef = InstanceType<typeof ElTable>;
type N8nInputRef = InstanceType<typeof N8nInput>;

const INPUT_TRANSITION_TIMEOUT = 350;
const DELETE_TRANSITION_TIMEOUT = 100;

export default defineComponent({
	name: 'TagsTable',
	props: ['rows', 'isLoading', 'newName', 'isSaving'],
	data() {
		return {
			maxLength: MAX_TAG_NAME_LENGTH,
		};
	},
	watch: {
		rows(newValue: ITagRow[] | undefined) {
			if (newValue?.[0] && newValue[0].create) {
				this.focusOnCreate();
			}
		},
	},
	mounted() {
		if (this.rows.length === 1 && this.rows[0].create) {
			this.focusOnInput();
		}
	},
	methods: {
		getRowClasses: ({ row }: { row: ITagRow }): string => {
			return row.disable ? 'disabled' : '';
		},

		getSpan({ row, columnIndex }: { row: ITagRow; columnIndex: number }): number | number[] {
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
				const inputRef = this.$refs.nameInput as N8nInputRef | undefined;
				if (inputRef?.focus) {
					inputRef.focus();
				}
			}, INPUT_TRANSITION_TIMEOUT);
		},

		focusOnDelete(): void {
			setTimeout(() => {
				const inputRef = this.$refs.deleteHiddenInput as N8nInputRef | undefined;
				if (inputRef?.focus) {
					inputRef.focus();
				}
			}, DELETE_TRANSITION_TIMEOUT);
		},

		focusOnCreate(): void {
			const bodyWrapperRef = (this.$refs.table as TableRef).$refs.bodyWrapper as HTMLElement;
			if (bodyWrapperRef) {
				bodyWrapperRef.scrollTop = 0;
			}

			this.focusOnInput();
		},
	},
});
</script>

<style lang="scss" scoped>
.tags-table {
	:deep(tr.disabled) {
		pointer-events: none;
	}
}

.name {
	min-height: 45px;
	display: flex;
	align-items: center;
}

.ops {
	min-height: 45px;
	justify-content: flex-end;
	align-items: center;
	display: flex;
	flex-wrap: nowrap;
	float: right;

	> * {
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

.ops.main {
	display: none;
	margin-left: 2px;
}

tr:hover .ops:not(.disabled) {
	display: flex;
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
