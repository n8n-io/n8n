<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Draggable from 'vuedraggable';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nIconButton, N8nLoading, N8nText, N8nTooltip } from '@n8n/design-system';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { ADD_BOARD_CARD_MODAL_KEY } from '@/features/core/dataTable/constants';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import AddBoardCardModal from '@/features/core/dataTable/components/AddBoardCardModal.vue';

type Props = {
	dataTable: DataTable;
	search?: string;
	readOnly?: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggleSave: [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const dataTableStore = useDataTableStore();
const uiStore = useUIStore();

const loading = ref(false);
const rowsByStatus = reactive<Record<string, DataTableRow[]>>({});
const trashDropList = ref<DataTableRow[]>([]);
const isDraggingCard = ref(false);
const hoveredColumn = ref<string | null>(null);
const isDeleteZoneHovered = ref(false);

const addCardModalKey = computed(() => `${ADD_BOARD_CARD_MODAL_KEY}-${props.dataTable.id}`);

const statuses = computed(() => props.dataTable.metadata?.allowedStatuses ?? []);

const normalizedSearch = computed(() => props.search?.trim().toLowerCase() ?? '');

const matchesSearch = (row: DataTableRow) => {
	if (!normalizedSearch.value) {
		return true;
	}

	const name = String(row.name ?? '').toLowerCase();
	const description = String(row.description ?? '').toLowerCase();

	return name.includes(normalizedSearch.value) || description.includes(normalizedSearch.value);
};

const visibleRowsByStatus = computed(() => {
	const grouped: Record<string, DataTableRow[]> = {};

	for (const status of statuses.value) {
		grouped[status] = (rowsByStatus[status] ?? []).filter(matchesSearch);
	}

	return grouped;
});

const getRowId = (row: DataTableRow) => {
	const rowId = Number(row.id);
	return Number.isNaN(rowId) ? String(row.id) : rowId;
};

const getCardDescription = (row: DataTableRow) => String(row.description ?? '').trim();

const getCardTitle = (row: DataTableRow) =>
	String(row.name ?? '').trim() || i18n.baseText('board.kanban.untitledCard');

const removeCardFromBoard = (rowId: number) => {
	for (const status of statuses.value) {
		rowsByStatus[status] = (rowsByStatus[status] ?? []).filter(
			(existingRow) => Number(existingRow.id) !== rowId,
		);
	}
};

const confirmDeleteCard = async (row: DataTableRow) => {
	return await message.confirm(
		i18n.baseText('board.kanban.deleteCard.confirmation', {
			interpolate: { name: getCardTitle(row) },
		}),
		i18n.baseText('board.kanban.deleteCard.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
};

const syncRowsByStatus = (rows: DataTableRow[]) => {
	for (const status of statuses.value) {
		rowsByStatus[status] = [];
	}

	for (const row of rows) {
		const status = String(row.status ?? '');
		if (statuses.value.includes(status)) {
			rowsByStatus[status].push(row);
		}
	}
};

const fetchRows = async () => {
	if (statuses.value.length === 0) {
		for (const status of Object.keys(rowsByStatus)) {
			delete rowsByStatus[status];
		}
		return;
	}

	loading.value = true;
	try {
		const pageSize = 100;
		let skip = 0;
		let totalCount = 0;
		const rows: DataTableRow[] = [];

		do {
			const response = await dataTableStore.fetchDataTableContent(
				props.dataTable.id,
				props.dataTable.projectId,
				Math.floor(skip / pageSize) + 1,
				pageSize,
				'id:asc',
			);
			rows.push(...response.data);
			totalCount = response.count;
			skip += pageSize;
		} while (rows.length < totalCount);

		syncRowsByStatus(rows);
	} catch (error) {
		toast.showError(error, i18n.baseText('board.kanban.loadError'));
	} finally {
		loading.value = false;
	}
};

const onCardListChange = async (
	event: { added?: { element: DataTableRow } },
	targetStatus: string,
) => {
	if (!event.added || props.readOnly) {
		return;
	}

	const row = event.added.element;
	if (String(row.status ?? '') === targetStatus) {
		return;
	}

	const rowId = Number(row.id);
	if (Number.isNaN(rowId)) {
		return;
	}

	emit('toggleSave', true);
	try {
		await dataTableStore.updateRow(props.dataTable.id, props.dataTable.projectId, rowId, {
			status: targetStatus,
		});
		row.status = targetStatus;
	} catch (error) {
		toast.showError(error, i18n.baseText('board.kanban.moveError'));
		await fetchRows();
	} finally {
		emit('toggleSave', false);
	}
};

const isDeleteDropTarget = (element?: HTMLElement | null) => {
	return Boolean(element?.closest('[data-board-kanban-delete-zone]'));
};

const onDragStart = () => {
	if (!props.readOnly) {
		isDraggingCard.value = true;
	}
};

const onCardMove = (event: { to?: HTMLElement | null }) => {
	if (isDeleteDropTarget(event.to)) {
		hoveredColumn.value = null;
		isDeleteZoneHovered.value = true;
		return true;
	}

	isDeleteZoneHovered.value = false;
	const column = event.to?.closest<HTMLElement>('[data-board-kanban-status]');
	hoveredColumn.value = column?.dataset.boardKanbanStatus ?? null;
	return true;
};

const onDeleteZoneEnter = () => {
	if (!isDraggingCard.value) {
		return;
	}

	hoveredColumn.value = null;
	isDeleteZoneHovered.value = true;
};

const onDeleteZoneLeave = () => {
	isDeleteZoneHovered.value = false;
};

const onDragEnd = () => {
	isDraggingCard.value = false;
	hoveredColumn.value = null;
	isDeleteZoneHovered.value = false;
	if (trashDropList.value.length > 0) {
		trashDropList.value = [];
		void fetchRows();
	}
};

const onTrashDrop = async (event: { added?: { element: DataTableRow } }) => {
	if (!event.added || props.readOnly) {
		trashDropList.value = [];
		return;
	}

	const row = event.added.element;
	trashDropList.value = [];

	const rowId = Number(row.id);
	if (Number.isNaN(rowId)) {
		await fetchRows();
		return;
	}

	const confirmResponse = await confirmDeleteCard(row);
	if (confirmResponse !== MODAL_CONFIRM) {
		await fetchRows();
		return;
	}

	emit('toggleSave', true);
	try {
		await dataTableStore.deleteRows(props.dataTable.id, props.dataTable.projectId, [rowId]);
		removeCardFromBoard(rowId);
	} catch (error) {
		toast.showError(error, i18n.baseText('board.kanban.deleteCard.error'));
		await fetchRows();
	} finally {
		emit('toggleSave', false);
	}
};

const onAddCard = (status: string) => {
	if (props.readOnly) {
		return;
	}

	uiStore.openModalWithData({
		name: addCardModalKey.value,
		data: { initialStatus: status },
	});
};

const onCardCreated = (row: DataTableRow) => {
	const status = String(row.status ?? '');
	if (!statuses.value.includes(status)) {
		return;
	}

	rowsByStatus[status] = [...(rowsByStatus[status] ?? []), row];
};

const onCardUpdated = (row: DataTableRow) => {
	const status = String(row.status ?? '');
	const rowId = getRowId(row);

	for (const columnStatus of statuses.value) {
		rowsByStatus[columnStatus] = (rowsByStatus[columnStatus] ?? []).filter(
			(existingRow) => getRowId(existingRow) !== rowId,
		);
	}

	if (!statuses.value.includes(status)) {
		return;
	}

	rowsByStatus[status] = [...(rowsByStatus[status] ?? []), row];
};

const onCardDeleted = (rowId: number) => {
	removeCardFromBoard(rowId);
};

const onEditCard = (row: DataTableRow) => {
	if (props.readOnly) {
		return;
	}

	uiStore.openModalWithData({
		name: addCardModalKey.value,
		data: { card: row },
	});
};

watch(
	() => [props.dataTable.id, props.dataTable.metadata?.allowedStatuses],
	async () => {
		await fetchRows();
	},
	{ immediate: true, deep: true },
);

defineExpose({
	fetchRows,
});
</script>

<template>
	<div :class="$style.boardKanban" data-test-id="board-kanban-view">
		<N8nLoading v-if="loading" :loading="true" :rows="4" :shrink-last="false" />
		<div v-else-if="statuses.length === 0" :class="$style.emptyState">
			<N8nText color="text-light">{{ i18n.baseText('board.kanban.noStatuses') }}</N8nText>
		</div>
		<div v-else :class="$style.columns">
			<section
				v-for="(status, index) in statuses"
				:key="status"
				:class="[
					$style.column,
					{
						[$style.columnWithDivider]: index < statuses.length - 1,
						[$style.columnDragActive]: isDraggingCard && hoveredColumn === status,
					},
				]"
				:data-test-id="`board-kanban-column-${status}`"
				:data-board-kanban-status="status"
			>
				<header :class="$style.columnHeader">
					<div :class="$style.columnTitle">
						<N8nText bold>{{ status }}</N8nText>
						<N8nTooltip :content="i18n.baseText('board.kanban.addCard')">
							<N8nIconButton
								variant="ghost"
								icon="plus"
								size="small"
								:aria-label="i18n.baseText('board.kanban.addCard')"
								:disabled="readOnly"
								:data-test-id="`board-kanban-add-card-${status}`"
								@click="onAddCard(status)"
							/>
						</N8nTooltip>
					</div>
					<N8nText size="small" color="text-light">
						{{ visibleRowsByStatus[status]?.length ?? 0 }}
					</N8nText>
				</header>
				<div :class="$style.columnBody">
					<div :class="$style.columnScroller">
						<Draggable
							v-model="rowsByStatus[status]"
							:group="{ name: 'board-cards' }"
							:item-key="getRowId"
							:disabled="readOnly"
							:animation="150"
							ghost-class="board-kanban-card-ghost"
							fallback-class="board-kanban-card-fallback"
							:fallback-on-body="true"
							:force-fallback="true"
							:class="$style.cardList"
							@start="onDragStart"
							@end="onDragEnd"
							@move="onCardMove"
							@change="onCardListChange($event, status)"
						>
							<template #item="{ element }">
								<article
									v-show="matchesSearch(element)"
									:class="$style.card"
									:data-test-id="`board-kanban-card-${element.id}`"
									@dblclick.stop="onEditCard(element)"
								>
									<N8nText bold :class="$style.cardTitle">
										{{ getCardTitle(element) }}
									</N8nText>
									<N8nText
										v-if="getCardDescription(element)"
										size="small"
										color="text-light"
										:class="$style.cardDescription"
										:title="getCardDescription(element)"
									>
										{{ getCardDescription(element) }}
									</N8nText>
								</article>
							</template>
						</Draggable>
					</div>
					<div v-if="(visibleRowsByStatus[status]?.length ?? 0) === 0" :class="$style.emptyColumn">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('board.kanban.emptyColumn') }}
						</N8nText>
					</div>
				</div>
			</section>
		</div>
		<div
			v-show="isDraggingCard && !readOnly"
			:class="[$style.deleteDropZone, { [$style.deleteDropZoneActive]: isDeleteZoneHovered }]"
			data-test-id="board-kanban-delete-drop-zone"
			data-board-kanban-delete-zone
			@pointerenter="onDeleteZoneEnter"
			@pointerleave="onDeleteZoneLeave"
		>
			<Draggable
				v-model="trashDropList"
				:group="{ name: 'board-cards' }"
				:item-key="getRowId"
				:sort="false"
				ghost-class="board-kanban-delete-ghost"
				drag-class="board-kanban-delete-drag"
				:class="$style.deleteDropTarget"
				@change="onTrashDrop"
				@move="onCardMove"
			>
				<template #item>
					<div :class="$style.deleteDropCard" />
				</template>
			</Draggable>
			<div
				:class="[
					$style.deleteDropZoneContent,
					{ [$style.deleteDropZoneContentActive]: isDeleteZoneHovered },
				]"
				aria-hidden="true"
			>
				<N8nIcon icon="trash-2" :size="isDeleteZoneHovered ? 'large' : 'medium'" color="danger" />
				<N8nText size="small" :bold="isDeleteZoneHovered" color="danger">
					{{ i18n.baseText('board.kanban.deleteCard.dropZone') }}
				</N8nText>
			</div>
		</div>
		<AddBoardCardModal
			:modal-name="addCardModalKey"
			:data-table-id="dataTable.id"
			:project-id="dataTable.projectId"
			:allowed-statuses="statuses"
			@created="onCardCreated"
			@updated="onCardUpdated"
			@deleted="onCardDeleted"
			@toggle-save="emit('toggleSave', $event)"
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

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
}

.columns {
	display: flex;
	flex: 1;
	align-items: stretch;
	gap: 0;
	min-height: 0;
	height: 100%;
	overflow-x: auto;
	overflow-y: hidden;
}

.column {
	display: flex;
	flex-direction: column;
	flex: 0 0 18rem;
	width: 18rem;
	min-width: 18rem;
	align-self: stretch;
	height: 100%;
	min-height: 100%;
	padding: var(--spacing--xs);
	background-color: var(--color--background--light-2);
	transition: background-color 0.15s ease;
}

.columnDragActive {
	background-color: var(--color--background--light-3);
	box-shadow: inset 0 0 0 1px var(--focus--border-color);
}

.columnWithDivider {
	border-right: 1px solid var(--border-color);
}

.columnHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
}

.columnTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.columnBody {
	position: relative;
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.columnScroller {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
}

.cardList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-height: 100%;
	padding: var(--spacing--4xs);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius--2xs);
	border: 1px solid var(--border-color);
	background-color: var(--color--background--base);
	cursor: grab;
}

.cardTitle {
	width: 100%;
	min-width: 0;
	word-break: break-word;
	user-select: none;
}

.cardDescription {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	overflow: hidden;
	white-space: pre-wrap;
	word-break: break-word;
	user-select: none;
}

.cardGhost {
	opacity: 0.6;
}

:global(.board-kanban-card-ghost) {
	opacity: 0.6;
}

:global(.board-kanban-delete-ghost),
:global(.board-kanban-delete-drag) {
	display: none !important;
}

:global(.board-kanban-card-fallback) {
	z-index: 10001;
	opacity: 0.9;
	user-select: none;
}

.emptyColumn {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xs) var(--spacing--3xs);
	pointer-events: none;
}

.deleteDropZone {
	position: fixed;
	left: 50%;
	bottom: var(--spacing--lg);
	z-index: 100;
	min-width: 12rem;
	min-height: 4.5rem;
	padding: var(--spacing--sm) var(--spacing--md);
	border: 1px dashed var(--color--danger--tint-1);
	border-radius: var(--radius--2xs);
	background-color: var(--color--danger--tint-4);
	transform: translateX(-50%);
	box-shadow: var(--shadow--md);
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease,
		border-width 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.15s ease;

	:global(article) {
		display: none !important;
	}
}

.deleteDropZoneActive {
	border-style: solid;
	border-width: 2px;
	border-color: var(--color--danger);
	background-color: var(--color--danger--tint-2);
	box-shadow:
		var(--shadow--lg),
		0 0 0 3px var(--color--danger--tint-3);
	transform: translateX(-50%) scale(1.05);
}

.deleteDropTarget {
	min-width: 100%;
	min-height: 100%;
}

.deleteDropTarget > * {
	display: none !important;
}

.deleteDropCard {
	display: none;
}

.deleteDropZoneContent {
	position: absolute;
	inset: 0;
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--4xs);
	color: var(--color--text--danger);
	pointer-events: none;
	user-select: none;
	transition:
		color 0.15s ease,
		gap 0.15s ease;
}

.deleteDropZoneContentActive {
	color: var(--color--danger--shade-1);
	gap: var(--spacing--3xs);
}
</style>
