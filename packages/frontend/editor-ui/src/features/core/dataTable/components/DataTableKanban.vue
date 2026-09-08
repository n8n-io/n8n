<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Draggable from 'vuedraggable';
import { N8nButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { TIME } from '@/app/constants/durations';
import type { DataTable, DataTableRow, DataTableValue } from '../dataTable.types';
import { useDataTableStore } from '../dataTable.store';
import DataTableRowDialog from './DataTableRowDialog.vue';

const props = defineProps<{ dataTable: DataTable; search: string; readOnly: boolean }>();
const emit = defineEmits<{ toggleSave: [value: boolean] }>();
const store = useDataTableStore();
const i18n = useI18n();
const toast = useToast();
const PAGE_SIZE = 50;
type Lane = {
	key: string;
	value: string | null;
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
const saving = ref(false);
const dialog = ref<{ row?: DataTableRow; initialValues?: DataTableRow }>();
const groupColumn = computed(() =>
	props.dataTable.columns.find(
		(column) =>
			column.id === props.dataTable.metadata?.kanban?.groupByColumnId && column.type === 'enum',
	),
);
const titleColumn = computed(() =>
	props.dataTable.columns.find(
		(column) => column.id === props.dataTable.metadata?.kanban?.titleColumnId,
	),
);
const previewColumns = computed(() =>
	[...props.dataTable.columns]
		.sort((a, b) => a.index - b.index)
		.filter(
			(column) =>
				!['id', 'createdAt', 'updatedAt'].includes(column.name) &&
				column.id !== groupColumn.value?.id &&
				column.id !== titleColumn.value?.id,
		)
		.slice(0, 5),
);
let generation = 0;
let disposed = false;
let polling: ReturnType<typeof setInterval> | undefined;
let revision = '';
const busy = computed(() => saving.value || lanes.value.some((lane) => lane.initialLoading));

function formatValue(value: DataTableValue | undefined) {
	if (value === null || value === undefined || value === '')
		return i18n.baseText('dataTable.kanban.emptyValue');
	if (typeof value === 'boolean')
		return i18n.baseText(value ? 'dataTable.kanban.true' : 'dataTable.kanban.false');
	return value instanceof Date ? value.toLocaleString() : String(value);
}

function emptyLanes(): Lane[] {
	return [
		...(groupColumn.value?.options ?? []).map((value, index) => ({
			key: String(index),
			value,
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
		groupColumn.value?.options,
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

type CardListChangeEvent = {
	added?: { element: DataTableRow; newIndex: number };
	moved?: { element: DataTableRow; newIndex: number };
};

function onDragStart() {
	dragging.value = true;
	generation++;
	lanes.value.forEach((lane) => (lane.refreshing = false));
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
				:class="$style.column"
				data-test-id="kanban-lane"
				:aria-label="lane.value ?? i18n.baseText('dataTable.kanban.unassigned')"
			>
				<header :class="$style.columnHeader">
					<N8nText bold>{{ lane.value ?? i18n.baseText('dataTable.kanban.unassigned') }}</N8nText>
					<N8nSpinner v-if="lane.initialLoading" />
					<N8nText v-else size="small" color="text-light">{{ lane.count }}</N8nText>
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
						:class="$style.cardList"
						@start="onDragStart"
						@end="dragging = false"
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
								<N8nText v-if="titleColumn" bold :class="$style.cardTitle">{{
									formatValue(element[titleColumn.name])
								}}</N8nText>
								<dl :class="$style.preview">
									<div
										v-for="column in previewColumns"
										:key="column.id"
										:class="$style.previewField"
									>
										<dt>{{ column.name }}</dt>
										<dd :title="formatValue(element[column.name])">
											{{ formatValue(element[column.name]) }}
										</dd>
									</div>
								</dl>
								<N8nText v-if="!titleColumn && !previewColumns.length">{{
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
	border-radius: var(--radius--md);
	background: var(--background--surface);
	box-shadow: var(--shadow--md);
}
.columnHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	overflow-wrap: anywhere;
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
.cardTitle {
	overflow-wrap: anywhere;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
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
	opacity: 0.4;
}
</style>
