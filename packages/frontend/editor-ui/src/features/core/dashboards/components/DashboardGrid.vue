<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';

import KpiWidget from '@/features/core/dashboards/components/widgets/KpiWidget.vue';
import ChartWidget from '@/features/core/dashboards/components/widgets/ChartWidget.vue';
import TableWidget from '@/features/core/dashboards/components/widgets/TableWidget.vue';
import RowEditorModal, {
	type RowEditorColumn,
} from '@/features/core/dashboards/components/edit/RowEditorModal.vue';
import { useWidgetData } from '@/features/core/dashboards/composables/useWidgetData';
import {
	executeDashboardActionApi,
	fetchDataTableColumnsApi,
} from '@/features/core/dashboards/dashboards.api';
import {
	insertDataTableRowApi,
	updateDataTableRowsApi,
	deleteDataTableRowsApi,
} from '@/features/core/dataTable/dataTable.api';
import type {
	DashboardAction,
	DashboardWidget,
	NormalizedDashboardSpec,
	TableWidget as TableWidgetType,
} from '@/features/core/dashboards/dashboards.types';
import { DEFAULT_GRID_COLUMNS } from '@/features/core/dashboards/constants';
import { computed } from 'vue';

const props = defineProps<{
	spec: NormalizedDashboardSpec;
	viewId?: string;
	projectId: string;
	dashboardId: string;
	editable?: boolean;
}>();

const emit = defineEmits<{
	(e: 'editWidget', widget: DashboardWidget): void;
}>();

const { data, loading, errors, load } = useWidgetData(props.projectId);
const rootStore = useRootStore();
const toast = useToast();

// Resolve which widgets to render for the current view.
const activeWidgets = computed<DashboardWidget[]>(() => {
	const targetId = props.viewId ?? props.spec.views[0]?.id;
	const view = props.spec.views.find((v) => v.id === targetId) ?? props.spec.views[0];
	return view?.widgets ?? [];
});

// Forwarded to the row editor — pulled from the active table widget's spec.
const editorColumns = computed(() =>
	editorWidget.value ? (columnCache.value[editorWidget.value.dataSource.dataTableId] ?? []) : [],
);

const editorHints = computed(() => {
	if (!editorWidget.value) return {};
	const out: Record<string, NonNullable<TableWidgetType['columns'][number]['inputHint']>> = {};
	for (const col of editorWidget.value.columns) {
		if (col.inputHint) out[col.key] = col.inputHint;
	}
	return out;
});

const editorLabels = computed(() => {
	if (!editorWidget.value) return {};
	const out: Record<string, string> = {};
	for (const col of editorWidget.value.columns) {
		out[col.key] = col.label;
	}
	return out;
});

// row editor state
const editorOpen = ref(false);
const editorMode = ref<'create' | 'edit'>('create');
const editorWidget = ref<TableWidgetType | null>(null);
const editorRow = ref<Record<string, unknown> | null>(null);
const editorSaving = ref(false);
const editorError = ref('');

// column cache per data table
const columnCache = ref<Record<string, RowEditorColumn[]>>({});

async function refreshAll() {
	for (const widget of activeWidgets.value) {
		await load(widget);
	}
}

onMounted(refreshAll);
watch(() => [props.spec, props.viewId], refreshAll, { deep: true });

function styleForWidget(widget: DashboardWidget) {
	const colSpan = Math.min(widget.colSpan ?? 4, DEFAULT_GRID_COLUMNS);
	return {
		gridColumn: `span ${colSpan}`,
		gridRow: `span ${widget.rowSpan ?? 1}`,
	};
}

async function handleAction({
	action,
	row,
	widgetId,
}: {
	action: DashboardAction;
	row: Record<string, unknown>;
	widgetId: string;
}) {
	// One-shot idempotency key per click — protects against double-tap firing
	// the workflow twice. The backend caches by (dashboardId, slug, key) for ~60s.
	const idempotencyKey =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	try {
		const result = await executeDashboardActionApi(
			rootStore.restApiContext,
			props.projectId,
			props.dashboardId,
			action.slug,
			{ widgetId, rowId: String(row.id ?? ''), row, idempotencyKey },
		);
		if (result.ok) {
			showActionSuccessToast(action, result);
			// Live refresh: the workflow likely mutated rows the dashboard
			// reads from. Refetch every widget on the current view so the
			// user sees the change (e.g. status flipping from "open" to
			// "shipped" without a manual page reload).
			void refreshActiveView();
		} else {
			// Surface non-2xx responses — e.g. 404 from a misconfigured webhook
			// path, or 502 from the workflow itself — so the user isn't staring
			// at a button that silently does nothing.
			const bodyPreview =
				typeof result.body === 'string'
					? result.body.slice(0, 200)
					: JSON.stringify(result.body).slice(0, 200);
			toast.showError(
				new Error(`Status ${result.status}. ${bodyPreview}`),
				`${action.label} failed`,
			);
		}
	} catch (e) {
		toast.showError(e, `${action.label} failed`);
	}
}

function showActionSuccessToast(
	action: DashboardAction,
	result: { status: number; workflowId?: string; webhookNodeName?: string },
) {
	// Match the design's "Workflow fired · {label}" toast: title gives the
	// human-readable action, body shows the workflow node ref + status, and
	// (when we know the workflow id) we link to its executions list.
	const workflowName = result.webhookNodeName ?? 'webhook';
	const lines = [`${workflowName} · started just now (${result.status})`];
	const link = result.workflowId
		? `<a href="/workflow/${result.workflowId}/executions" target="_blank" rel="noopener">View runs</a>`
		: '';
	toast.showMessage({
		type: 'success',
		title: `Workflow fired · ${action.label}`,
		message: link ? `${lines[0]} · ${link}` : lines[0],
		duration: 5000,
		dangerouslyUseHTMLString: true,
	});
}

async function refreshActiveView() {
	// Reuse the same `load` we already use on mount/spec-change — it walks
	// the active widgets and reissues their aggregate/rows requests in parallel.
	await Promise.all(activeWidgets.value.map((w) => load(w)));
}

async function ensureColumns(dataTableId: string): Promise<RowEditorColumn[]> {
	if (columnCache.value[dataTableId]) return columnCache.value[dataTableId];
	const cols = await fetchDataTableColumnsApi(
		rootStore.restApiContext,
		props.projectId,
		dataTableId,
	);
	columnCache.value[dataTableId] = cols;
	return cols;
}

async function openAdd(widget: TableWidgetType) {
	editorWidget.value = widget;
	editorRow.value = null;
	editorMode.value = 'create';
	editorError.value = '';
	editorOpen.value = true;
	await ensureColumns(widget.dataSource.dataTableId);
}

async function openEdit(widget: TableWidgetType, row: Record<string, unknown>) {
	editorWidget.value = widget;
	editorRow.value = row;
	editorMode.value = 'edit';
	editorError.value = '';
	editorOpen.value = true;
	await ensureColumns(widget.dataSource.dataTableId);
}

function closeEditor() {
	editorOpen.value = false;
	editorRow.value = null;
	editorWidget.value = null;
}

async function onSubmit(payload: Record<string, unknown>) {
	if (!editorWidget.value) return;
	editorSaving.value = true;
	editorError.value = '';
	try {
		const widget = editorWidget.value;
		const tableId = widget.dataSource.dataTableId;
		if (editorMode.value === 'create') {
			await insertDataTableRowApi(
				rootStore.restApiContext,
				tableId,
				payload as Record<string, string | number | boolean | Date | null>,
				props.projectId,
			);
		} else if (editorRow.value?.id !== undefined) {
			await updateDataTableRowsApi(
				rootStore.restApiContext,
				tableId,
				Number(editorRow.value.id),
				payload as Record<string, string | number | boolean | Date | null>,
				props.projectId,
			);
		}
		await load(widget);
		closeEditor();
	} catch (e) {
		editorError.value = e instanceof Error ? e.message : String(e);
	} finally {
		editorSaving.value = false;
	}
}

async function onDelete(widget: TableWidgetType, row: Record<string, unknown>) {
	if (row.id === undefined) return;
	try {
		await deleteDataTableRowsApi(
			rootStore.restApiContext,
			widget.dataSource.dataTableId,
			[Number(row.id)],
			props.projectId,
		);
		await load(widget);
	} catch (e) {
		console.error('Failed to delete row', e);
	}
}
</script>

<template>
	<div class="dashboard-grid">
		<div
			v-for="widget in activeWidgets"
			:key="widget.id"
			class="dashboard-grid__cell"
			:style="styleForWidget(widget)"
			@dblclick="editable && emit('editWidget', widget)"
		>
			<KpiWidget
				v-if="widget.type === 'kpi'"
				:widget="widget"
				:value="data[widget.id]"
				:loading="!!loading[widget.id]"
				:error="errors[widget.id]"
			/>
			<ChartWidget
				v-else-if="widget.type === 'chart'"
				:widget="widget"
				:rows="data[widget.id] as Array<Record<string, unknown>> | undefined"
				:loading="!!loading[widget.id]"
				:error="errors[widget.id]"
			/>
			<TableWidget
				v-else-if="widget.type === 'table'"
				:widget="widget"
				:rows="data[widget.id] as Array<Record<string, unknown>> | undefined"
				:loading="!!loading[widget.id]"
				:error="errors[widget.id]"
				:can-edit="editable"
				@action="(payload) => handleAction({ ...payload, widgetId: widget.id })"
				@add="openAdd(widget)"
				@edit="(row) => openEdit(widget, row)"
				@delete="(row) => onDelete(widget, row)"
				@configure="emit('editWidget', widget)"
			/>
		</div>

		<RowEditorModal
			:open="editorOpen"
			:mode="editorMode"
			:columns="editorColumns"
			:hints="editorHints"
			:labels="editorLabels"
			:initial-row="editorRow"
			:saving="editorSaving"
			:error="editorError"
			@close="closeEditor"
			@submit="onSubmit"
		/>
	</div>
</template>

<style scoped lang="scss">
.dashboard-grid {
	/* Stable 12-col grid that never shifts width between view tabs.
	 * `minmax(0, 1fr)` prevents a too-wide widget (long table cell, monospace
	 * URL, etc.) from forcing its column wider than 1/12 of the container,
	 * which would otherwise visibly shift the page when switching tabs. */
	display: grid;
	grid-template-columns: repeat(12, minmax(0, 1fr));
	gap: var(--spacing--md);
	width: 100%;
	/* Reserve enough vertical space that sparse views ("Overview" with 3 KPIs)
	 * don't snap shorter than dense views ("All orders" with a long table). */
	min-height: 60vh;
	align-content: start;
}
.dashboard-grid__cell {
	min-height: 120px;
	min-width: 0; /* allow grid item to shrink inside its 1fr track */
	display: flex;
	flex-direction: column;
	overflow: hidden; /* contain wide content (long URLs, monospace IDs) */
}
</style>
