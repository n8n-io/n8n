<script setup lang="ts">
import { ElTable } from 'element-plus';
import { MAX_TAG_NAME_LENGTH } from '@/constants';
import type { ITagRow } from '@/Interface';
import { onMounted, ref, watch } from 'vue';
import { N8nInput } from 'n8n-design-system';
import type { BaseTextKey } from '@/plugins/i18n';

// TODO Check order, convert css to module

const INPUT_TRANSITION_TIMEOUT = 350;
const DELETE_TRANSITION_TIMEOUT = 100;

const table = ref<InstanceType<typeof ElTable> | null>(null);
const nameInput = ref<InstanceType<typeof N8nInput> | null>(null);

const maxLength = ref(MAX_TAG_NAME_LENGTH);

interface Props {
	rows: ITagRow[];
	isLoading: boolean;
	newName: string;
	isSaving: boolean;
	usageColumnTitleLocaleKey: BaseTextKey;
}

const props = withDefaults(defineProps<Props>(), {
	usageColumnTitleLocaleKey: 'tagsTable.usage',
});

const emit = defineEmits<{
	updateEnable: [id: string];
	newNameChange: [name: string];
	deleteEnable: [id: string];
	cancelOperation: [];
	applyOperation: [];
}>();

watch(
	() => props.rows,
	(newValue: ITagRow[] | undefined) => {
		if (newValue?.[0] && newValue[0].create) {
			focusOnCreate();
		}
	},
);

onMounted(() => {
	if (props.rows.length === 1 && props.rows[0].create) {
		focusOnInput();
	}
});

const getRowClasses = ({ row }: { row: ITagRow }): string => {
	return row.disable ? 'disabled' : '';
};

const getSpan = ({
	row,
	columnIndex,
}: {
	row: ITagRow;
	columnIndex: number;
}): { rowspan: number; colspan: number } | undefined => {
	// expand text column with delete message
	if (columnIndex === 0 && row.tag && row.delete) {
		return { rowspan: 1, colspan: 2 };
	}
	// hide usage column on delete
	if (columnIndex === 1 && row.tag && row.delete) {
		return { rowspan: 0, colspan: 0 };
	}

	return { rowspan: 1, colspan: 1 };
};

const enableUpdate = (row: ITagRow): void => {
	if (row.tag) {
		emit('updateEnable', row.tag.id);
		emit('newNameChange', row.tag.name);
		focusOnInput();
	}
};

const enableDelete = (row: ITagRow): void => {
	if (row.tag) {
		emit('deleteEnable', row.tag.id);
		focusOnDelete();
	}
};

const cancel = (): void => {
	emit('cancelOperation');
};

const apply = (): void => {
	emit('applyOperation');
};

const onNewNameChange = (name: string): void => {
	emit('newNameChange', name);
};

const focusOnInput = (): void => {
	setTimeout(() => {
		if (nameInput.value?.focus) {
			nameInput.value.focus();
		}
	}, INPUT_TRANSITION_TIMEOUT);
};

const focusOnDelete = (): void => {
	setTimeout(() => {
		const inputRef = nameInput.value;
		if (inputRef?.focus) {
			inputRef.focus();
		}
	}, DELETE_TRANSITION_TIMEOUT);
};

const focusOnCreate = (): void => {
	const bodyWrapperRef = table.value?.$refs.bodyWrapper as HTMLElement;
	if (bodyWrapperRef) {
		bodyWrapperRef.scrollTop = 0;
	}

	focusOnInput();
};
</script>

<template>
	<ElTable
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
						<N8nInput
							v-if="scope.row.create || scope.row.update"
							ref="nameInput"
							:model-value="newName"
							:maxlength="maxLength"
							@update:model-value="onNewNameChange"
						></N8nInput>
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
		<el-table-column :label="$locale.baseText(usageColumnTitleLocaleKey)" width="170">
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
	</ElTable>
</template>

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
