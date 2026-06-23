<script lang="ts" setup>
import { ref, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import DataTableTable from '@/features/core/dataTable/components/dataGrid/DataTableTable.vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';

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

const dataTable = ref<DataTable | null>(null);
const isLoading = ref(false);
const fetchError = ref<string | null>(null);

async function fetchDataTable(id: string, projectId: string) {
	const isRefresh = dataTable.value?.id === id;

	fetchError.value = null;
	if (!isRefresh) {
		isLoading.value = true;
		dataTable.value = null;
	}

	try {
		const result = isRefresh
			? await dataTableStore.fetchDataTableDetails(id, projectId)
			: await dataTableStore.fetchOrFindDataTable(id, projectId);
		dataTable.value = result ?? null;
		if (!result) {
			fetchError.value = i18n.baseText('instanceAi.dataTablePreview.fetchError');
		}
	} catch {
		dataTable.value = null;
		fetchError.value = i18n.baseText('instanceAi.dataTablePreview.fetchError');
	} finally {
		isLoading.value = false;
	}
}

// Re-fetch when dataTableId changes OR when refreshKey increments (same table modified).
watch(
	() => [props.dataTableId, props.refreshKey] as const,
	async ([id]) => {
		if (id && props.projectId) {
			await fetchDataTable(id, props.projectId);
		} else {
			dataTable.value = null;
			fetchError.value = null;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.content">
		<!-- Error (only when no data table to show) -->
		<div v-if="fetchError && !dataTable" :class="$style.centerState">
			<N8nText color="text-light">{{ fetchError }}</N8nText>
		</div>

		<!-- Data table grid -->
		<DataTableTable
			v-if="dataTable"
			:key="props.refreshKey"
			:data-table="dataTable"
			:read-only="true"
		/>

		<!-- Loading overlay (shown during initial load or when no data table yet) -->
		<div v-if="isLoading && !dataTable" :class="$style.centerState">
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

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	height: 100%;
}
</style>
