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
	loading: boolean;
	loaded: boolean;
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
const busy = computed(() => saving.value || lanes.value.some((lane) => lane.loading));

function formatValue(value: DataTableValue | undefined) {
	if (value === null || value === undefined || value === '')
		return i18n.baseText('dataTable.kanban.emptyValue');
	if (typeof value === 'boolean')
		return i18n.baseText(value ? 'dataTable.kanban.true' : 'dataTable.kanban.false');
	return value instanceof Date ? value.toLocaleString() : String(value);
}

async function loadLane(lane: Lane, append = false) {
	const column = groupColumn.value;
	if (!column || lane.loading) return;
	const requestGeneration = generation;
	lane.loading = true;
	lane.failed = false;
	try {
		const loaded: DataTableRow[] = append ? [...lane.rows] : [];
		const target = append ? loaded.length + PAGE_SIZE : Math.max(PAGE_SIZE, lane.rows.length);
		let page = append ? Math.floor(loaded.length / PAGE_SIZE) + 1 : 1;
		let count = 0;
		do {
			const response = await store.fetchDataTableContent(
				props.dataTable.id,
				props.dataTable.projectId,
				page,
				PAGE_SIZE,
				'id:asc',
				JSON.stringify({
					type: 'and',
					filters: [{ columnName: column.name, condition: 'eq', value: lane.value }],
				}),
				props.search,
			);
			if (disposed || requestGeneration !== generation) return;
			loaded.push(...response.data);
			count = response.count;
			page++;
			if (!response.data.length) break;
		} while (loaded.length < Math.min(target, count));
		lane.rows = [...new Map(loaded.map((row) => [row.id, row])).values()];
		lane.count = count;
		lane.loaded = true;
	} catch (error) {
		if (!disposed && requestGeneration === generation) {
			lane.failed = true;
			toast.showError(error, i18n.baseText('dataTable.kanban.loadError'));
		}
	} finally {
		lane.loading = false;
	}
}

async function fetchRows() {
	// Limit concurrent requests when an enum has many options.
	const queue = [...lanes.value];
	const requestGeneration = generation;
	await Promise.all(
		Array.from({ length: Math.min(4, queue.length) }, async () => {
			while (queue.length && !disposed && requestGeneration === generation) {
				const lane = queue.shift();
				if (lane) await loadLane(lane);
			}
		}),
	);
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
		lanes.value = [
			...(groupColumn.value?.options ?? []).map((value, index) => ({
				key: String(index),
				value,
				rows: [],
				count: 0,
				loading: false,
				loaded: false,
				failed: false,
			})),
			{
				key: 'unassigned',
				value: null,
				rows: [],
				count: 0,
				loading: false,
				loaded: false,
				failed: false,
			},
		];
		await fetchRows();
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

async function onCardListChange(event: { added?: { element: DataTableRow } }, lane: Lane) {
	if (!event.added || !groupColumn.value || props.readOnly) return;
	const row = event.added.element;
	const columnName = groupColumn.value.name;
	const oldValue = row[columnName] ?? null;
	if (oldValue === lane.value) return;
	const source = lanes.value.find((item) => item.value === oldValue);
	const oldSourceRows = source
		? [...source.rows, row].sort((a, b) => Number(a.id) - Number(b.id))
		: [];
	const oldTargetRows = lane.rows.filter((item) => item.id !== row.id);
	saving.value = true;
	emit('toggleSave', true);
	generation++;
	row[columnName] = lane.value;
	try {
		await store.updateRow(props.dataTable.id, props.dataTable.projectId, Number(row.id), {
			[columnName]: lane.value,
		});
	} catch (error) {
		row[columnName] = oldValue;
		lane.rows = oldTargetRows;
		if (source) source.rows = oldSourceRows;
		toast.showError(error, i18n.baseText('dataTable.kanban.moveError'));
	} finally {
		saving.value = false;
		emit('toggleSave', false);
		await fetchRows();
	}
}

onMounted(() => {
	polling = setInterval(() => {
		if (
			!document.hidden &&
			!busy.value &&
			!dragging.value &&
			!dialog.value &&
			!lanes.value.some((lane) => lane.failed)
		)
			void fetchRows();
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
					<N8nSpinner v-if="lane.loading && !lane.loaded" />
					<N8nText v-else size="small" color="text-light">{{ lane.count }}</N8nText>
				</header>
				<div :class="$style.columnScroller">
					<Draggable
						v-model="lane.rows"
						:group="{ name: `data-table-${dataTable.id}` }"
						item-key="id"
						:sort="false"
						:disabled="readOnly || busy || !!dialog"
						:force-fallback="true"
						:fallback-on-body="true"
						ghost-class="data-table-kanban-ghost"
						:class="$style.cardList"
						@start="dragging = true"
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
					<N8nButton v-if="lane.failed" variant="ghost" :disabled="busy" @click="loadLane(lane)">{{
						i18n.baseText('dataTable.kanban.retry')
					}}</N8nButton>
					<N8nButton
						v-else-if="lane.rows.length < lane.count"
						variant="ghost"
						:disabled="busy || dragging || !!dialog"
						@click="loadLane(lane, true)"
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
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		line-height: var(--line-height--md);
		color: var(--text-color--subtler);
		overflow-wrap: anywhere;
	}
	dd {
		margin: 0;
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
		font-weight: var(--font-weight--bold);
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
