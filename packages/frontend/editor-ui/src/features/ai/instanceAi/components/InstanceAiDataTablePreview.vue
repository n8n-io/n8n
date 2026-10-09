<script lang="ts" setup>
import { computed, ref, shallowRef, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import DataTableTable from '@/features/core/dataTable/components/dataGrid/DataTableTable.vue';
import DataTableLoadingIndicator from '@/features/core/dataTable/components/dataGrid/DataTableLoadingIndicator.vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useIsAgentWorking } from '../composables/useIsAgentWorking';

const props = withDefaults(
	defineProps<{
		dataTableId: string | null;
		projectId: string | null;
		/** Incremented to force re-fetch even when dataTableId stays the same (e.g. rows were added). */
		refreshKey?: number;
	}>(),
	{ refreshKey: 0 },
);

const i18n = useI18n();
const dataTableStore = useDataTableStore();
const sourceControlStore = useSourceControlStore();

type TablePreview = {
	key: number;
	dataTable: DataTable;
};

const tableSlots = shallowRef<{ displayed: TablePreview | null; pending: TablePreview | null }>({
	displayed: null,
	pending: null,
});
const tables = computed(() =>
	[tableSlots.value.displayed, tableSlots.value.pending].filter((table) => table !== null),
);
const isLoading = ref(false);
const fetchError = ref<string | null>(null);
const requestKey = ref(0);

// === Editing lock ===
// The grid is editable only while the AI is not running, so user edits can't
// race agent mutations (each successful data-tables tool call re-fetches and
// remounts the grid, which would discard an in-progress cell edit).
const isAgentWorking = useIsAgentWorking();

// No client-side RBAC gate, mirroring DataTableDetailsView: the server
// enforces write permissions and rejections surface as error toasts.
const isReadOnly = computed(
	() => isAgentWorking.value || sourceControlStore.preferences.branchReadOnly,
);

function showTable(key: number) {
	const { pending } = tableSlots.value;
	if (pending?.key !== key) return;
	tableSlots.value = { displayed: pending, pending: null };
	isLoading.value = false;
}

function onLoadError(key: number) {
	if (tableSlots.value.pending?.key !== key) return;

	tableSlots.value = { displayed: null, pending: null };
	isLoading.value = false;
	fetchError.value = i18n.baseText('instanceAi.dataTablePreview.fetchError');
}

watch(
	() => [props.dataTableId, props.projectId, props.refreshKey] as const,
	async ([id, projectId], _previous, onCleanup) => {
		let cancelled = false;
		onCleanup(() => {
			cancelled = true;
		});

		tableSlots.value = { displayed: tableSlots.value.displayed, pending: null };
		fetchError.value = null;
		isLoading.value = !!id && !!projectId;
		if (!id || !projectId) {
			tableSlots.value = { displayed: null, pending: null };
			return;
		}
		const key = ++requestKey.value;

		// Fetch the current schema before the replacement grid permits edits.
		const result = await dataTableStore.fetchDataTableDetails(id, projectId).catch(() => null);
		if (cancelled) return;
		if (result) {
			tableSlots.value = {
				displayed: tableSlots.value.displayed,
				pending: { key, dataTable: result },
			};
		} else {
			tableSlots.value = { displayed: null, pending: null };
			isLoading.value = false;
			fetchError.value = i18n.baseText('instanceAi.dataTablePreview.fetchError');
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.content" :aria-busy="isLoading">
		<div v-if="fetchError" :class="$style.centerState">
			<N8nText color="text-light">{{ fetchError }}</N8nText>
		</div>

		<!-- Keep the previous grid visible until the replacement has rendered its rows. -->
		<div
			v-for="table in tables"
			:key="table.key"
			:class="{ [$style.pendingTable]: table.key !== tableSlots.displayed?.key }"
			:aria-hidden="table.key !== tableSlots.displayed?.key"
			:inert="isLoading || undefined"
			:data-table-id="table.dataTable.id"
			data-test-id="instance-ai-data-table-grid"
		>
			<DataTableTable
				:data-table="table.dataTable"
				:read-only="isReadOnly || (isLoading && table.key === tableSlots.displayed?.key)"
				@ready="showTable(table.key)"
				@load-error="onLoadError(table.key)"
			/>
		</div>

		<DataTableLoadingIndicator v-if="isLoading && tableSlots.displayed" :key="requestKey" />

		<div
			v-if="isLoading && !tableSlots.displayed"
			:class="$style.centerState"
			data-test-id="instance-ai-data-table-loading"
		>
			<N8nIcon icon="loader-circle" :size="80" spin />
		</div>
	</div>
</template>

<style lang="scss" module>
.content {
	flex: 1;
	min-height: 0;
	position: relative;
	height: 100%;
}

.pendingTable {
	position: absolute;
	inset: 0;
	visibility: hidden;
}

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	height: 100%;
}
</style>
