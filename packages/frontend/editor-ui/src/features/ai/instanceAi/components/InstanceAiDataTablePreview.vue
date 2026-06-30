<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import DataTableTable from '@/features/core/dataTable/components/dataGrid/DataTableTable.vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { collectActiveBuilderAgents } from '../builderAgents';
import { useThread } from '../instanceAi.store';

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
const thread = useThread();

const dataTable = ref<DataTable | null>(null);
const isLoading = ref(false);
const fetchError = ref<string | null>(null);

// === Editing lock ===
// The grid is editable only while the AI is not running, so user edits can't
// race agent mutations (each successful data-tables tool call re-fetches and
// remounts the grid, which would discard an in-progress cell edit). Hydration
// counts as busy: right after a reload an in-flight run isn't known until the
// thread status resolves.
// Note: a live confirmation keeps the run active (activeRunId stays set →
// isStreaming), so isStreaming already covers "awaiting confirmation mid-run".
// isAwaitingConfirmation is deliberately NOT used here — it can linger on
// confirmations left unresolved by an already-finished run, which would keep
// the grid locked while no run is active.
const isAgentWorking = computed(
	() =>
		thread.isHydratingThread ||
		thread.isStreaming ||
		thread.isSendingMessage ||
		collectActiveBuilderAgents(thread.messages).length > 0,
);

// No client-side RBAC gate, mirroring DataTableDetailsView: the server
// enforces write permissions and rejections surface as error toasts.
const isReadOnly = computed(
	() => isAgentWorking.value || sourceControlStore.preferences.branchReadOnly,
);

async function fetchDataTable(id: string, projectId: string) {
	const isRefresh = dataTable.value?.id === id;

	fetchError.value = null;
	if (!isRefresh) {
		isLoading.value = true;
		dataTable.value = null;
	}

	try {
		// Always fetch fresh details (never the store cache): the grid is
		// editable, so stale columns would let the user edit against a schema
		// the agent has since changed.
		const result = await dataTableStore.fetchDataTableDetails(id, projectId);
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

		<!-- Data table grid. readOnly is part of the key because the grid bakes it
		     into its column defs at grid-ready, so flipping it requires a remount. -->
		<DataTableTable
			v-if="dataTable"
			:key="`${props.refreshKey}-${isReadOnly}`"
			:data-table="dataTable"
			:read-only="isReadOnly"
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
