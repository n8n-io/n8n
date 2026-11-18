<script setup lang="ts">
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ICellEditorParams } from 'ag-grid-community';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';

import {
	type RowRuleMatch,
	useRowRulePeople,
} from '@/features/core/dataTable/composables/useRowRulePeople';

const props = defineProps<{
	params: ICellEditorParams & { match: RowRuleMatch };
}>();

const i18n = useI18n();
const { options, searchPeople } = useRowRulePeople();
const selectRef = useTemplateRef<{ focus: () => void }>('selectRef');

const value = ref<string | null>(
	typeof props.params.value === 'string' ? props.params.value : null,
);
const query = ref('');
const width = props.params.column.getActualWidth();

const visibleOptions = computed(() => {
	const needle = query.value.trim().toLowerCase();
	const all = options(props.params.match);
	return needle ? all.filter(({ label }) => label.toLowerCase().includes(needle)) : all;
});

function onFilter(text: string) {
	query.value = text;
	if (props.params.match !== 'project' && text.trim()) void searchPeople(text.trim());
}

async function onChange(selected: string | null) {
	value.value = selected || null;
	await nextTick();
	props.params.stopEditing();
}

onMounted(() => selectRef.value?.focus());

defineExpose({
	getValue: () => value.value,
	isPopup: () => true,
});
</script>

<template>
	<div
		:style="{ width: `${width}px` }"
		class="data-table-row-rule-editor"
		data-test-id="data-table-row-rule-editor"
	>
		<N8nSelect
			ref="selectRef"
			:model-value="value"
			size="small"
			filterable
			clearable
			automatic-dropdown
			:teleported="false"
			:filter-method="onFilter"
			:placeholder="
				i18n.baseText(
					params.match === 'project'
						? 'dataTable.rowAccess.pickTeam'
						: 'dataTable.rowAccess.pickPerson',
				)
			"
			popper-class="ag-custom-component-popup"
			@update:model-value="onChange"
		>
			<N8nOption
				v-for="option in visibleOptions"
				:key="option.value"
				:value="option.value"
				:label="option.label"
			/>
		</N8nSelect>
	</div>
</template>

<style lang="scss">
// The editor sits in AG Grid's popup, outside the theme scope of the page, so set
// the input colors here as the date editor does.
.data-table-row-rule-editor {
	.el-select__wrapper,
	.el-select__wrapper.is-focused,
	.el-select__wrapper.is-hovering {
		min-height: var(--ag-row-height);
		background-color: var(--color--background--light-2);
		box-shadow: none;
		border: var(--grid--cell--border-color--editing);
		border-radius: 0;
	}

	.el-select__input,
	.el-select__selected-item,
	.el-select__placeholder:not(.is-transparent) {
		background-color: transparent;
		color: var(--color--text);
	}
}
</style>
