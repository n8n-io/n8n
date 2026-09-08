<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DataTableMetadata } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type { DataTable } from '../dataTable.types';

const props = defineProps<{
	dataTable: DataTable;
	view: 'table' | 'kanban';
	disabled: boolean;
	save: (metadata: DataTableMetadata) => Promise<void>;
}>();
const i18n = useI18n();
const toast = useToast();
const open = ref(false);
const viewMenuOpen = ref(false);
const saving = ref(false);
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
	i18n.baseText(
		props.view === 'kanban' ? 'dataTable.kanban.view' : 'dataTable.kanban.tableView',
	),
);
const validGrouping = computed(() =>
	enumColumns.value.some((column) => column.id === groupByColumnId.value),
);

function configure() {
	viewMenuOpen.value = false;
	groupByColumnId.value = props.dataTable.metadata?.kanban?.groupByColumnId ?? '';
	open.value = true;
}

async function persist(metadata: DataTableMetadata) {
	if (props.disabled || saving.value) return;
	saving.value = true;
	try {
		await props.save(metadata);
		open.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.kanban.settingsError'));
	} finally {
		saving.value = false;
	}
}

async function switchView(view: 'table' | 'kanban') {
	if (view === 'table') {
		await persist({ view });
		return;
	}
	const settings = props.dataTable.metadata?.kanban;
	if (!settings || !enumColumns.value.some((column) => column.id === settings.groupByColumnId)) {
		if (enumColumns.value.length === 1) {
			await persist({
				view,
				kanban: { groupByColumnId: enumColumns.value[0].id },
			});
			return;
		}
		configure();
		return;
	}
	await persist({
		view,
		kanban: { groupByColumnId: settings.groupByColumnId },
	});
}
</script>

<template>
	<div :class="$style.controls" data-test-id="data-table-view-controls">
		<N8nDropdownMenu
			v-model="viewMenuOpen"
			:items="viewItems"
			:disabled="disabled || saving"
			placement="bottom-start"
			@select="switchView"
		>
			<template #trigger>
				<N8nButton
					variant="outline"
					data-test-id="data-table-view-selector"
					:disabled="disabled || saving"
				>
					{{ viewLabel }}
					<N8nIcon icon="chevron-down" size="small" />
				</N8nButton>
			</template>
			<template #item-trailing="{ item, ui }">
				<N8nIconButton
					v-if="item.id === 'kanban'"
					:class="ui.class"
					variant="ghost"
					icon="settings"
					size="small"
					:aria-label="i18n.baseText('dataTable.kanban.settings')"
					data-test-id="data-table-kanban-settings"
					@click.stop="configure"
				/>
			</template>
		</N8nDropdownMenu>
		<N8nDialog
			:open="open"
			:header="i18n.baseText('dataTable.kanban.settings')"
			:show-close-button="!saving"
			@update:open="!saving && (open = $event)"
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
						:disabled="saving"
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
					<N8nButton type="button" variant="ghost" :disabled="saving" @click="open = false">{{
						i18n.baseText('generic.cancel')
					}}</N8nButton>
					<N8nButton type="submit" :loading="saving" :disabled="disabled || !validGrouping">{{
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
