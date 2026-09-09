<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Draggable from 'vuedraggable';
import { N8nButton, N8nColorPicker, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { TIME } from '@/app/constants/durations';
import type { DataTable, DataTableColumn, DataTableRow, DataTableValue } from '../dataTable.types';
import type { DataTableEnumOption } from '@n8n/api-types';
import { useDataTableStore } from '../dataTable.store';
import DataTableRowDialog from './DataTableRowDialog.vue';

const props = defineProps<{
	dataTable: DataTable;
	search: string;
	readOnly: boolean;
	optionsReadOnly: boolean;
}>();
const emit = defineEmits<{
	toggleSave: [value: boolean];
	enumColumnUpdated: [column: DataTableColumn];
}>();
const store = useDataTableStore();
const i18n = useI18n();
const toast = useToast();
const PAGE_SIZE = 50;
type Lane = {
	key: string;
	value: string | null;
	option?: DataTableEnumOption;
	rows: DataTableRow[];
	count: number;
	nextCursor: string | null;
	hasMore: boolean;
	initialLoading: boolean;
	loadingMore: boolean;
	refreshing: boolean;
	failed: boolean;
};
const lanes = ref<Lane[]>([]);
const dragging = ref(false);
const dragSourceLaneKey = ref<string | null>(null);
const dragOverLaneKey = ref<string | null>(null);
const saving = ref(false);
const updatingColor = ref<string | null>(null);
const dialog = ref<{ row?: DataTableRow; initialValues?: DataTableRow }>();
const groupColumn = computed(() =>
	props.dataTable.columns.find(
		(column) =>
			column.id === props.dataTable.metadata?.kanban?.groupByColumnId && column.type === 'enum',
	),
);
const previewColumns = computed(() =>
	[...props.dataTable.columns]
		.sort((a, b) => a.index - b.index)
		.filter(
			(column) =>
				!['id', 'createdAt', 'updatedAt'].includes(column.name) &&
				column.id !== groupColumn.value?.id,
		)
		.slice(0, 5),
);
let generation = 0;
let disposed = false;
let polling: ReturnType<typeof setInterval> | undefined;
let revision = '';
const busy = computed(() => saving.value || lanes.value.some((lane) => lane.initialLoading));

function formatValue(value: DataTableValue | undefined, column?: DataTableColumn) {
	if (value === null || value === undefined || value === '')
		return i18n.baseText('dataTable.kanban.emptyValue');
	if (typeof value === 'boolean')
		return i18n.baseText(value ? 'dataTable.kanban.true' : 'dataTable.kanban.false');
	if (typeof value === 'object' && !(value instanceof Date)) return value.value;
	if (column?.type === 'enum' && typeof value === 'string') {
		return column.options?.find((option) => option.id === value)?.text ?? value;
	}
	return value instanceof Date ? value.toLocaleString() : String(value);
}

function emptyLanes(): Lane[] {
	return [
		...(groupColumn.value?.options ?? []).map((option) => ({
			key: option.id,
			value: option.id,
			option: { ...option },
			rows: [],
			count: 0,
			nextCursor: null,
			hasMore: false,
			initialLoading: true,
			loadingMore: false,
			refreshing: false,
			failed: false,
		})),
		{
			key: 'unassigned',
			value: null,
			rows: [],
			count: 0,
			nextCursor: null,
			hasMore: false,
			initialLoading: true,
			loadingMore: false,
			refreshing: false,
			failed: false,
		},
	];
}

async function hydrateLane(
	lane: {
		value: string | null;
		count: number;
		rows: DataTableRow[];
		nextCursor: string | null;
		hasMore: boolean;
	},
	targetSize: number,
	requestGeneration: number,
): Promise<Lane> {
	const column = groupColumn.value;
	if (!column) throw new Error('Kanban grouping column is not available');
	const rows = [...lane.rows];
	let nextCursor = lane.nextCursor;
	let hasMore = lane.hasMore;
	while (rows.length < targetSize && nextCursor && hasMore) {
		const page = await store.fetchDataTableKanbanLanePage(
			props.dataTable.id,
			props.dataTable.projectId,
			{
				groupByColumnId: column.id,
				laneValue: lane.value,
				limit: Math.min(PAGE_SIZE, targetSize - rows.length),
				cursor: nextCursor,
				search: props.search || undefined,
			},
		);
		if (disposed || requestGeneration !== generation) break;
		rows.push(...page.rows);
		nextCursor = page.nextCursor;
		hasMore = page.hasMore;
	}
	return {
		key: lane.value === null ? 'lane:null' : `lane:${lane.value}`,
		value: lane.value,
		option:
			lane.value === null
				? undefined
				: groupColumn.value.options?.find((option) => option.id === lane.value),
		rows: [...new Map(rows.map((row) => [row.id, row])).values()],
		count: lane.count,
		nextCursor,
		hasMore,
		initialLoading: false,
		loadingMore: false,
		refreshing: false,
		failed: false,
	};
}

async function fetchRows(refresh = true) {
	const column = groupColumn.value;
	if (!column) return;
	const requestGeneration = generation;
	if (!refresh) lanes.value = emptyLanes();
	else lanes.value.forEach((lane) => (lane.refreshing = true));
	try {
		const response = await store.fetchDataTableKanbanBoard(
			props.dataTable.id,
			props.dataTable.projectId,
			column.id,
			PAGE_SIZE,
			props.search || undefined,
		);
		if (disposed || requestGeneration !== generation) return;
		const oldLanes = new Map(lanes.value.map((lane) => [lane.value, lane]));
		const nextLanes = await Promise.all(
			response.lanes.map(async (lane) => {
				const oldLane = oldLanes.get(lane.value);
				return await hydrateLane(
					lane,
					refresh ? Math.max(PAGE_SIZE, oldLane?.rows.length ?? 0) : PAGE_SIZE,
					requestGeneration,
				);
			}),
		);
		if (disposed || requestGeneration !== generation) return;
		lanes.value = nextLanes;
		revision = response.revision;
	} catch (error) {
		if (!disposed && requestGeneration === generation) {
			lanes.value.forEach((lane) => {
				lane.initialLoading = false;
				lane.refreshing = false;
				lane.failed = true;
			});
			toast.showError(error, i18n.baseText('dataTable.kanban.loadError'));
		}
	}
}

async function loadMore(lane: Lane) {
	const column = groupColumn.value;
	if (!column || lane.loadingMore || !lane.nextCursor) return;
	const requestGeneration = generation;
	lane.loadingMore = true;
	lane.failed = false;
	try {
		const page = await store.fetchDataTableKanbanLanePage(
			props.dataTable.id,
			props.dataTable.projectId,
			{
				groupByColumnId: column.id,
				laneValue: lane.value,
				limit: PAGE_SIZE,
				cursor: lane.nextCursor,
				search: props.search || undefined,
			},
		);
		if (disposed || requestGeneration !== generation) return;
		lane.rows = [...new Map([...lane.rows, ...page.rows].map((row) => [row.id, row])).values()];
		lane.nextCursor = page.nextCursor;
		lane.hasMore = page.hasMore;
	} catch (error) {
		if (!disposed && requestGeneration === generation) {
			lane.failed = true;
			toast.showError(error, i18n.baseText('dataTable.kanban.loadError'));
		}
	} finally {
		lane.loadingMore = false;
	}
}

watch(
	() => [
		props.dataTable.id,
		props.dataTable.projectId,
		groupColumn.value?.id,
		groupColumn.value?.name,
		groupColumn.value?.options?.map((option) => option.id),
		props.search,
	],
	async () => {
		generation++;
		dialog.value = undefined;
		await fetchRows(false);
	},
	{ immediate: true, deep: true },
);

function addRow(value?: string | null) {
	if (props.readOnly || saving.value || !groupColumn.value) return;
	dialog.value = { initialValues: value === undefined ? {} : { [groupColumn.value.name]: value } };
}

function editRow(row: DataTableRow) {
	if (!dragging.value && !busy.value) dialog.value = { row: { ...row } };
}

async function updateLaneColor(lane: Lane, color: string | null) {
	const column = groupColumn.value;
	if (
		!column ||
		!lane.option ||
		!color ||
		props.optionsReadOnly ||
		updatingColor.value !== null ||
		lane.option.color === color
	) {
		return;
	}
	updatingColor.value = lane.value;
	emit('toggleSave', true);
	try {
		const updatedColumn = await store.updateDataTableEnumOptionColor(
			props.dataTable.id,
			props.dataTable.projectId,
			column.id,
			lane.option.id,
			color,
		);
		lane.option = updatedColumn.options?.find((option) => option.id === lane.value);
		emit('enumColumnUpdated', updatedColumn);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.kanban.updateColorError'));
	} finally {
		updatingColor.value = null;
		emit('toggleSave', false);
	}
}

type CardListChangeEvent = {
	added?: { element: DataTableRow; newIndex: number };
	moved?: { element: DataTableRow; newIndex: number };
};
type CardMoveEvent = {
	to: HTMLElement;
};

function onDragStart(lane: Lane) {
	dragging.value = true;
	dragSourceLaneKey.value = lane.key;
	dragOverLaneKey.value = null;
	generation++;
	lanes.value.forEach((lane) => (lane.refreshing = false));
}

function onDragMove(event: CardMoveEvent) {
	const targetLaneKey = event.to.dataset.kanbanLaneKey ?? null;
	dragOverLaneKey.value = targetLaneKey === dragSourceLaneKey.value ? null : targetLaneKey;
	return true;
}

function clearDragOver(lane: Lane) {
	if (dragOverLaneKey.value === lane.key) dragOverLaneKey.value = null;
}

function onDragEnd() {
	dragging.value = false;
	dragSourceLaneKey.value = null;
	dragOverLaneKey.value = null;
}

async function onCardListChange(event: CardListChangeEvent, lane: Lane) {
	const change = event.added ?? event.moved;
	if (!change || !groupColumn.value || props.readOnly) return;
	const row = change.element;
	const columnName = groupColumn.value.name;
	const oldValue = row[columnName] ?? null;
	const source = lanes.value.find((item) => item.value === oldValue);
	const previousRow = lane.rows[change.newIndex - 1];
	saving.value = true;
	emit('toggleSave', true);
	generation++;
	row[columnName] = lane.value;
	if (source && source !== lane) {
		source.count = Math.max(0, source.count - 1);
		lane.count++;
	}
	try {
		const moved = await store.moveDataTableKanbanRow(
			props.dataTable.id,
			props.dataTable.projectId,
			Number(row.id),
			{
				groupByColumnId: groupColumn.value.id,
				targetValue: lane.value,
				afterRowId: previousRow ? Number(previousRow.id) : null,
			},
		);
		Object.assign(row, moved);
		revision = '';
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.kanban.moveError'));
	} finally {
		saving.value = false;
		emit('toggleSave', false);
		await fetchRows(true);
	}
}

async function refreshIfChanged() {
	const requestGeneration = generation;
	try {
		const latest = await store.fetchDataTableDetails(
			props.dataTable.id,
			props.dataTable.projectId,
			false,
		);
		if (disposed || dragging.value || requestGeneration !== generation) return;
		if (latest && latest.updatedAt !== revision) await fetchRows(true);
	} catch {
		// The next interval retries this best-effort background refresh.
	}
}

onMounted(() => {
	polling = setInterval(() => {
		if (
			!document.hidden &&
			!busy.value &&
			!dragging.value &&
			!dialog.value &&
			!lanes.value.some((lane) => lane.refreshing) &&
			!lanes.value.some((lane) => lane.failed)
		) {
			void refreshIfChanged();
		}
	}, 3 * TIME.SECOND);
});
onBeforeUnmount(() => {
	disposed = true;
	generation++;
	clearInterval(polling);
});
defineExpose({ fetchRows, addRow });
</script>

<template>
	<div :class="$style.boardKanban" data-test-id="data-table-kanban">
		<div :class="$style.columns">
			<section
				v-for="lane in lanes"
				:key="lane.key"
				:class="[
					$style.column,
					{ [$style.columnDragOver]: dragging && dragOverLaneKey === lane.key },
				]"
				:style="lane.option ? { borderTopColor: lane.option.color } : undefined"
				data-test-id="kanban-lane"
				:aria-label="lane.option?.text ?? i18n.baseText('dataTable.kanban.unassigned')"
				@mouseleave="clearDragOver(lane)"
			>
				<header :class="$style.columnHeader">
					<N8nText bold>{{
						lane.option?.text ?? i18n.baseText('dataTable.kanban.unassigned')
					}}</N8nText>
					<div :class="$style.columnMeta">
						<N8nColorPicker
							v-if="lane.option && !optionsReadOnly"
							:model-value="lane.option.color"
							size="small"
							:show-input="false"
							:disabled="updatingColor !== null"
							@update:model-value="updateLaneColor(lane, $event)"
							@click.stop
						/>
						<N8nSpinner v-if="lane.initialLoading" />
						<N8nText v-else size="small" color="text-light">{{ lane.count }}</N8nText>
					</div>
				</header>
				<div :class="$style.columnScroller">
					<Draggable
						v-model="lane.rows"
						:group="{ name: `data-table-${dataTable.id}` }"
						item-key="id"
						:sort="true"
						:disabled="readOnly || busy || !!dialog"
						:force-fallback="true"
						:fallback-on-body="true"
						ghost-class="data-table-kanban-ghost"
						drag-class="data-table-kanban-drag"
						fallback-class="data-table-kanban-drag"
						:class="$style.cardList"
						:data-kanban-lane-key="lane.key"
						@start="onDragStart(lane)"
						@move="onDragMove"
						@end="onDragEnd"
						@change="onCardListChange($event, lane)"
					>
						<template #item="{ element }">
							<button
								type="button"
								:class="$style.card"
								data-test-id="kanban-card"
								:disabled="saving"
								:aria-label="
									i18n.baseText('dataTable.kanban.openRow', { interpolate: { id: element.id } })
								"
								@click="editRow(element)"
							>
								<dl :class="$style.preview">
									<div
										v-for="column in previewColumns"
										:key="column.id"
										:class="$style.previewField"
									>
										<dt>{{ column.name }}</dt>
										<dd :title="formatValue(element[column.name], column)">
											{{ formatValue(element[column.name], column) }}
										</dd>
									</div>
								</dl>
								<N8nText v-if="!previewColumns.length">{{
									i18n.baseText('dataTable.kanban.openRow', { interpolate: { id: element.id } })
								}}</N8nText>
							</button>
						</template>
					</Draggable>
					<N8nButton v-if="lane.failed" variant="ghost" :disabled="busy" @click="fetchRows(true)">{{
						i18n.baseText('dataTable.kanban.retry')
					}}</N8nButton>
					<N8nButton
						v-else-if="lane.hasMore"
						variant="ghost"
						:disabled="busy || lane.loadingMore || dragging || !!dialog"
						:loading="lane.loadingMore"
						@click="loadMore(lane)"
						>{{ i18n.baseText('dataTable.kanban.loadMore') }}</N8nButton
					>
				</div>
				<footer :class="$style.columnFooter">
					<N8nButton
						variant="ghost"
						icon="plus"
						:disabled="readOnly || saving"
						@click="addRow(lane.value)"
						>{{ i18n.baseText('dataTable.addRow.label') }}</N8nButton
					>
				</footer>
			</section>
		</div>
		<DataTableRowDialog
			v-if="dialog"
			:data-table="dataTable"
			:row="dialog.row"
			:initial-values="dialog.initialValues"
			:read-only="readOnly"
			@close="dialog = undefined"
			@saved="fetchRows"
			@toggle-save="
				saving = $event;
				emit('toggleSave', $event);
			"
		/>
	</div>
</template>

<style module lang="scss">
.boardKanban {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}
.columns {
	display: flex;
	flex: 1;
	align-items: flex-start;
	gap: var(--spacing--sm);
	min-height: 0;
	padding: var(--spacing--sm);
	overflow: auto;
}
.column {
	display: flex;
	flex-direction: column;
	flex: 0 0 calc(var(--spacing--5xl) + var(--spacing--xl));
	max-height: 100%;
	overflow: hidden;
	border: var(--border);
	border-top-width: var(--focus--border-width);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	box-shadow: var(--shadow--md);
}
.columnDragOver {
	outline: var(--focus--border-width) solid var(--focus--border-color);
	outline-offset: calc(var(--focus--border-width) * -1);
}
.columnHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	overflow-wrap: anywhere;
}
.columnMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.columnScroller {
	min-height: 0;
	overflow-y: auto;
}
.cardList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	min-height: var(--spacing--2xl);
}
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	color: var(--text-color);
	text-align: left;
	cursor: pointer;
	font: inherit;
}
.card:hover,
.card:focus-visible {
	border-color: var(--focus--border-color);
}
.preview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	width: 100%;
	font-size: var(--font-size--sm);
}
.previewField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	dt {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		line-height: var(--line-height--md);
		overflow-wrap: anywhere;
	}
	dd {
		margin: 0;
		font-size: var(--font-size--xs);
		line-height: var(--line-height--lg);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}
.columnFooter {
	padding: var(--spacing--xs);
}
:global(.data-table-kanban-ghost) {
	opacity: 0;
}
:global(.data-table-kanban-drag) {
	rotate: 2deg;
}
</style>
