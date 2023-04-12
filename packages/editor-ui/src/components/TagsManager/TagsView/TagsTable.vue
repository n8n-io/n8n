<template>
	<el-table
		stripe
		max-height="450"
		ref="table"
		:empty-text="$locale.baseText('tagsTable.noMatchingTagsExist')"
		:data="rows"
		:span-method="getSpan"
		:row-class-name="getRowClasses"
		v-loading="isLoading"
	>
		<el-table-column :label="$locale.baseText('tagsTable.name')">
			<template #default="scope">
				<div class="name" :key="scope.row.id" @keydown.stop>
					<transition name="fade" mode="out-in">
						<n8n-input
							v-if="scope.row.create || scope.row.update"
							:value="newName"
							:maxlength="maxLength"
							@input="onNewNameChange"
							ref="nameInput"
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
					<div class="ops" v-if="scope.row.create">
						<n8n-button
							:label="$locale.baseText('tagsTable.cancel')"
							@click.stop="cancel"
							type="secondary"
							:disabled="isSaving"
						/>
						<n8n-button
							:label="$locale.baseText('tagsTable.createTag')"
							@click.stop="apply"
							:loading="isSaving"
						/>
					</div>
					<div class="ops" v-else-if="scope.row.update">
						<n8n-button
							:label="$locale.baseText('tagsTable.cancel')"
							@click.stop="cancel"
							type="secondary"
							:disabled="isSaving"
						/>
						<n8n-button
							:label="$locale.baseText('tagsTable.saveChanges')"
							@click.stop="apply"
							:loading="isSaving"
						/>
					</div>
					<div class="ops" v-else-if="scope.row.delete">
						<n8n-button
							:label="$locale.baseText('tagsTable.cancel')"
							@click.stop="cancel"
							type="secondary"
							:disabled="isSaving"
						/>
						<n8n-button
							:label="$locale.baseText('tagsTable.deleteTag')"
							@click.stop="apply"
							:loading="isSaving"
						/>
					</div>
					<div class="ops main" v-else-if="!scope.row.disable">
						<n8n-icon-button
							:title="$locale.baseText('tagsTable.editTag')"
							@click.stop="enableUpdate(scope.row)"
							icon="pen"
							data-test-id="edit-tag-button"
						/>
						<n8n-icon-button
							v-if="scope.row.canDelete"
							:title="$locale.baseText('tagsTable.deleteTag')"
							@click.stop="enableDelete(scope.row)"
							icon="trash"
							data-test-id="delete-tag-button"
						/>
					</div>
				</transition>
			</template>
		</el-table-column>
	</el-table>
</template>

<script lang="ts">
import { MAX_TAG_NAME_LENGTH } from '@/constants';
import { ITagRow } from '@/Interface';
import Vue from 'vue';

const INPUT_TRANSITION_TIMEOUT = 350;
const DELETE_TRANSITION_TIMEOUT = 100;

export default Vue.extend({
	name: 'TagsTable',
	props: ['rows', 'isLoading', 'newName', 'isSaving'],
	data() {
		return {
			maxLength: MAX_TAG_NAME_LENGTH,
		};
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const input = this.$refs.nameInput as any;
				if (input && input.focus) {
					input.focus();
				}
			}, INPUT_TRANSITION_TIMEOUT);
		},

		focusOnDelete(): void {
			setTimeout(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const input = this.$refs.deleteHiddenInput as any;
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

::v-deep tr.disabled {
	pointer-events: none;
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
