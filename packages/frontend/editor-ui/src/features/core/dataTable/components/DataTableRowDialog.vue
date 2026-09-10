<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nCollapsiblePanel,
	N8nDialog,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { useDataTableStore } from '../dataTable.store';
import AutomationStatusLink from './AutomationStatusLink.vue';
import type {
	DataTable,
	DataTableColumn,
	DataTableRow,
	DataTableRowAutomation,
	DataTableValue,
} from '../dataTable.types';

const props = defineProps<{
	dataTable: DataTable;
	row?: DataTableRow;
	initialValues?: DataTableRow;
	readOnly: boolean;
}>();
const emit = defineEmits<{ close: []; saved: []; toggleSave: [value: boolean] }>();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const store = useDataTableStore();
const saving = ref(false);
const additionalDetailsOpen = ref(false);
const isNullish = (value: unknown) => value === null || value === undefined;
const formatInitialValue = (value: DataTableValue | undefined) => {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'object') return value.id;
	return String(value);
};
const initial = Object.fromEntries(
	props.dataTable.columns.map((column) => {
		const value = props.row
			? props.row[column.name]
			: (props.initialValues?.[column.name] ?? column.defaultValue ?? null);
		return [column.id, formatInitialValue(value)];
	}),
);
const values = ref<Record<string, string>>({ ...initial });
const nullFields = ref(
	new Set(
		props.dataTable.columns
			.filter((column) =>
				props.row
					? isNullish(props.row[column.name])
					: props.initialValues?.[column.name] === null ||
						(props.initialValues?.[column.name] === undefined && isNullish(column.defaultValue)),
			)
			.map((column) => column.id),
	),
);
const initialNullFields = new Set(nullFields.value);
const columns = computed(() => [...props.dataTable.columns].sort((a, b) => a.index - b.index));
const additionalDetails = computed(() => {
	if (!props.row) return [];
	return [
		{ label: i18n.baseText('dataTable.kanban.rowId'), value: props.row.id },
		{ label: i18n.baseText('dataTable.kanban.createdAt'), value: props.row.createdAt },
		{ label: i18n.baseText('dataTable.kanban.updatedAt'), value: props.row.updatedAt },
	];
});
// Execution status per trigger node, shown with the other read-only details
const automations = computed<DataTableRowAutomation[]>(() => {
	const list: unknown = props.row?.automations;
	return Array.isArray(list) ? (list as DataTableRowAutomation[]) : [];
});

function setValue(columnId: string, value: string) {
	values.value[columnId] = value;
	nullFields.value.delete(columnId);
}

function getSelectedEnumOption(column: DataTableColumn) {
	if (column.type !== 'enum') return undefined;
	return column.options?.find((option) => option.id === values.value[column.id]);
}

async function save() {
	if (props.readOnly || saving.value) return;
	const data: DataTableRow = {};
	try {
		for (const column of columns.value) {
			const value = values.value[column.id] ?? '';
			const isNull = nullFields.value.has(column.id) || (column.type !== 'string' && value === '');
			if (
				props.row &&
				initial[column.id] === value &&
				initialNullFields.has(column.id) === nullFields.value.has(column.id)
			)
				continue;
			if (isNull) data[column.name] = null;
			else if (column.type === 'number') {
				const numericValue = Number(value);
				if (
					!Number.isFinite(numericValue) ||
					(Number.isInteger(numericValue) && !Number.isSafeInteger(numericValue))
				)
					throw new Error(
						i18n.baseText('dataTable.kanban.invalidNumber', { interpolate: { name: column.name } }),
					);
				data[column.name] = numericValue;
			} else if (column.type === 'boolean') data[column.name] = value === 'true';
			else if (column.type === 'date') {
				const date = new Date(value);
				if (Number.isNaN(date.getTime()))
					throw new Error(
						i18n.baseText('dataTable.kanban.invalidDate', { interpolate: { name: column.name } }),
					);
				data[column.name] = date.toISOString();
			} else data[column.name] = value;
		}
		saving.value = true;
		emit('toggleSave', true);
		if (props.row) {
			if (Object.keys(data).length)
				await store.updateRow(
					props.dataTable.id,
					props.dataTable.projectId,
					Number(props.row.id),
					data,
				);
		} else await store.insertRow(props.dataTable.id, props.dataTable.projectId, data);
		emit('saved');
		emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.kanban.saveRowError'));
	} finally {
		saving.value = false;
		emit('toggleSave', false);
	}
}

async function deleteRow() {
	if (!props.row || props.readOnly || saving.value) return;
	const result = await message.confirm(
		i18n.baseText('dataTable.kanban.deleteConfirmation'),
		i18n.baseText('dataTable.kanban.deleteRow'),
		{
			confirmButtonText: i18n.baseText('dataTable.kanban.deleteRow'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (result !== MODAL_CONFIRM) return;
	saving.value = true;
	emit('toggleSave', true);
	try {
		await store.deleteRows(props.dataTable.id, props.dataTable.projectId, [Number(props.row.id)]);
		emit('saved');
		emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.kanban.deleteRowError'));
	} finally {
		saving.value = false;
		emit('toggleSave', false);
	}
}
</script>

<template>
	<N8nDialog
		:open="true"
		:header="i18n.baseText(row ? 'dataTable.kanban.editRow' : 'dataTable.addRow.label')"
		:show-close-button="!saving"
		@update:open="!$event && !saving && emit('close')"
	>
		<form :class="$style.form" @submit.prevent="save">
			<div :class="$style.fields">
				<N8nInputLabel
					v-for="column in columns"
					:key="column.id"
					:input-name="`row-field-${column.id}`"
					:label="column.name"
				>
					<div :class="$style.field">
						<N8nSelect
							v-if="column.type === 'enum' || column.type === 'boolean'"
							:id="`row-field-${column.id}`"
							:model-value="nullFields.has(column.id) ? '' : values[column.id]"
							:teleported="false"
							:disabled="readOnly || saving"
							@update:model-value="setValue(column.id, $event)"
						>
							<template v-if="getSelectedEnumOption(column)" #prefix>
								<span
									:class="$style.enumSwatch"
									:style="{ backgroundColor: getSelectedEnumOption(column)?.color }"
								/>
							</template>
							<N8nOption value="" :label="i18n.baseText('dataTable.kanban.emptyValue')" />
							<template v-if="column.type === 'boolean'">
								<N8nOption value="true" :label="i18n.baseText('dataTable.kanban.true')" />
								<N8nOption value="false" :label="i18n.baseText('dataTable.kanban.false')" />
							</template>
							<template v-else
								><N8nOption
									v-for="option in column.options ?? []"
									:key="option.id"
									:value="option.id"
									:label="option.text"
								>
									<div :class="$style.enumOption">
										<span :class="$style.enumSwatch" :style="{ backgroundColor: option.color }" />
										<span>{{ option.text }}</span>
									</div>
								</N8nOption></template
							>
						</N8nSelect>
						<N8nInput
							v-else
							:id="`row-field-${column.id}`"
							:model-value="values[column.id]"
							:type="column.type === 'number' ? 'number' : 'text'"
							step="any"
							:disabled="readOnly || saving"
							:placeholder="
								nullFields.has(column.id) ? i18n.baseText('dataTable.kanban.emptyValue') : undefined
							"
							@update:model-value="setValue(column.id, $event)"
						/>
						<N8nButton
							v-if="!readOnly"
							type="button"
							variant="ghost"
							:disabled="saving || nullFields.has(column.id)"
							@click="
								values[column.id] = '';
								nullFields.add(column.id);
							"
							>{{ i18n.baseText('dataTable.kanban.clear') }}</N8nButton
						>
					</div>
				</N8nInputLabel>
				<N8nCollapsiblePanel
					v-if="row"
					v-model="additionalDetailsOpen"
					:title="i18n.baseText('dataTable.kanban.additionalDetails')"
					disable-animation
				>
					<dl :class="$style.additionalDetails">
						<div
							v-for="detail in additionalDetails"
							:key="detail.label"
							:class="$style.additionalDetail"
						>
							<N8nText tag="dt" size="xsmall" color="text-light" bold>
								{{ detail.label }}
							</N8nText>
							<N8nText tag="dd" size="xsmall" color="text-light">
								{{ detail.value }}
							</N8nText>
						</div>
						<div
							v-for="automation in automations"
							:key="automation.nodeId"
							:class="$style.additionalDetail"
							data-test-id="data-table-row-automation"
						>
							<N8nText tag="dt" size="xsmall" color="text-light" bold>
								{{
									automation.workflowName ?? i18n.baseText('dataTable.automation.unknownWorkflow')
								}}
							</N8nText>
							<dd><AutomationStatusLink :automation="automation" /></dd>
						</div>
					</dl>
				</N8nCollapsiblePanel>
			</div>
			<footer :class="$style.actions">
				<N8nButton
					v-if="row && !readOnly"
					type="button"
					variant="destructive"
					:disabled="saving"
					@click="deleteRow"
					>{{ i18n.baseText('dataTable.kanban.deleteRow') }}</N8nButton
				>
				<N8nButton type="button" variant="ghost" :disabled="saving" @click="emit('close')">{{
					i18n.baseText('generic.close')
				}}</N8nButton>
				<N8nButton v-if="!readOnly" type="submit" :loading="saving">{{
					i18n.baseText('generic.save')
				}}</N8nButton>
			</footer>
		</form>
	</N8nDialog>
</template>

<style module lang="scss">
.form,
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.form {
	padding: var(--spacing--sm);
	min-height: 0;
}
.fields {
	overflow-y: auto;
	max-height: 60vh;
}
.field,
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.additionalDetails {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
}
.additionalDetail {
	display: grid;
	grid-template-columns: minmax(var(--spacing--4xl), 1fr) 2fr;
	gap: var(--spacing--2xs);

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
}
.enumOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.enumSwatch {
	flex: 0 0 var(--spacing--2xs);
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--round);
}
.actions {
	justify-content: flex-end;
}
</style>
