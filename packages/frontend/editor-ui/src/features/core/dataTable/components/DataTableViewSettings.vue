<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DataTableMetadata } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDropdownMenu,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { DataTable } from '../dataTable.types';

const props = defineProps<{
	dataTable: DataTable;
	view: 'table' | 'kanban';
	disabled: boolean;
	save: (metadata: DataTableMetadata) => void;
}>();
const i18n = useI18n();
const open = ref(false);
const viewMenuOpen = ref(false);
const groupMenuOpen = ref(false);
const groupByColumnId = ref('');
const enumColumns = computed(() =>
	props.dataTable.columns.filter((column) => column.type === 'enum'),
);
const viewItems = computed<Array<DropdownMenuItemProps<'table' | 'kanban'>>>(() => [
	{
		id: 'table',
		label: i18n.baseText('dataTable.kanban.tableView'),
		checked: props.view === 'table',
	},
	{
		id: 'kanban',
		label: i18n.baseText('dataTable.kanban.view'),
		checked: props.view === 'kanban',
	},
]);
const viewLabel = computed(() =>
	i18n.baseText(props.view === 'kanban' ? 'dataTable.kanban.view' : 'dataTable.kanban.tableView'),
);
const selectedGroupColumn = computed(() =>
	enumColumns.value.find(
		(column) => column.id === props.dataTable.metadata?.kanban?.groupByColumnId,
	),
);
const groupItems = computed<Array<DropdownMenuItemProps<string>>>(() =>
	enumColumns.value.map((column) => ({
		id: column.id,
		label: column.name,
		checked: column.id === selectedGroupColumn.value?.id,
	})),
);
const groupLabel = computed(() =>
	i18n.baseText('dataTable.kanban.sortBy', {
		interpolate: { column: selectedGroupColumn.value?.name ?? '' },
	}),
);
const validGrouping = computed(() =>
	enumColumns.value.some((column) => column.id === groupByColumnId.value),
);

function configure() {
	viewMenuOpen.value = false;
	groupByColumnId.value = props.dataTable.metadata?.kanban?.groupByColumnId ?? '';
	open.value = true;
}

function persist(metadata: DataTableMetadata) {
	if (props.disabled) return;
	props.save(metadata);
	open.value = false;
}

function switchView(view: 'table' | 'kanban') {
	if (view === 'table') {
		persist({ ...props.dataTable.metadata, view });
		return;
	}
	const settings = props.dataTable.metadata?.kanban;
	if (!settings || !enumColumns.value.some((column) => column.id === settings.groupByColumnId)) {
		if (enumColumns.value.length === 1) {
			persist({
				view,
				kanban: { groupByColumnId: enumColumns.value[0].id },
			});
			return;
		}
		configure();
		return;
	}
	persist({
		view,
		kanban: { groupByColumnId: settings.groupByColumnId },
	});
}

function switchGrouping(columnId: string) {
	groupMenuOpen.value = false;
	if (columnId === selectedGroupColumn.value?.id) return;
	persist({
		view: 'kanban',
		kanban: { groupByColumnId: columnId },
	});
}
</script>

<template>
	<div :class="$style.controls" data-test-id="data-table-view-controls">
		<N8nDropdownMenu
			v-if="view === 'kanban'"
			v-model="groupMenuOpen"
			:items="groupItems"
			:disabled="disabled"
			placement="bottom-start"
			@select="switchGrouping"
		>
			<template #trigger>
				<N8nButton
					variant="outline"
					data-test-id="data-table-kanban-group-selector"
					:disabled="disabled"
				>
					{{ groupLabel }}
					<N8nIcon icon="chevron-down" size="small" />
				</N8nButton>
			</template>
		</N8nDropdownMenu>
		<N8nDropdownMenu
			v-model="viewMenuOpen"
			:items="viewItems"
			:disabled="disabled"
			placement="bottom-start"
			@select="switchView"
		>
			<template #trigger>
				<N8nButton variant="outline" data-test-id="data-table-view-selector" :disabled="disabled">
					{{ viewLabel }}
					<N8nIcon icon="chevron-down" size="small" />
				</N8nButton>
			</template>
		</N8nDropdownMenu>
		<N8nDialog
			:open="open"
			:header="i18n.baseText('dataTable.kanban.settings')"
			@update:open="open = $event"
		>
			<form
				:class="$style.form"
				@submit.prevent="
					validGrouping &&
					persist({
						view: 'kanban',
						kanban: { groupByColumnId },
					})
				"
			>
				<N8nText v-if="enumColumns.length === 0">{{
					i18n.baseText('dataTable.kanban.noEnum')
				}}</N8nText>
				<N8nInputLabel
					input-name="kanban-group-column"
					:label="i18n.baseText('dataTable.kanban.groupBy')"
				>
					<N8nSelect
						id="kanban-group-column"
						v-model="groupByColumnId"
						:teleported="false"
						:disabled="disabled"
						data-test-id="kanban-group-column"
					>
						<N8nOption
							v-for="column in enumColumns"
							:key="column.id"
							:value="column.id"
							:label="column.name"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<div :class="$style.controls">
					<N8nButton type="button" variant="ghost" @click="open = false">{{
						i18n.baseText('generic.cancel')
					}}</N8nButton>
					<N8nButton type="submit" :disabled="disabled || !validGrouping">{{
						i18n.baseText('generic.save')
					}}</N8nButton>
				</div>
			</form>
		</N8nDialog>
	</div>
</template>

<style module lang="scss">
.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}
</style>
