<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
	AddColumnResponse,
	DataTable,
	DataTableColumnCreatePayload,
} from '@/features/core/dataTable/dataTable.types';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRouter, useRoute } from 'vue-router';
import {
	BOARD_DETAILS,
	BOARD_VIEW,
	DATA_TABLE_DETAILS,
	DATA_TABLE_VIEW,
	PROJECT_BOARDS,
	PROJECT_DATA_TABLES,
} from '@/features/core/dataTable/constants';
import type { BoardAllowedStatus, DataTableKind } from '@n8n/api-types';
import { LOADING_ANIMATION_MIN_DURATION } from '@/app/constants/durations';
import DataTableBreadcrumbs from '@/features/core/dataTable/components/DataTableBreadcrumbs.vue';
import BoardKanbanView from '@/features/core/dataTable/components/BoardKanbanView.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import DataTableTable from './components/dataGrid/DataTableTable.vue';
import { useDebounce } from '@/app/composables/useDebounce';
import AddColumnButton from './components/dataGrid/AddColumnButton.vue';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import {
	N8nButton,
	N8nInput,
	N8nLoading,
	N8nSpinner,
	N8nText,
	N8nIcon,
	N8nTooltip,
} from '@n8n/design-system';
import DependencyPill from '@/app/components/DependencyPill.vue';
import { useDependencies } from '@/app/composables/useDependencies';

type Props = {
	id: string;
	projectId: string;
};

const props = defineProps<Props>();

const toast = useToast();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const documentTitle = useDocumentTitle();

const dataTableStore = useDataTableStore();
const sourceControlStore = useSourceControlStore();
const { fetchDependencyCounts, hasDependencies } = useDependencies();

const dataTableKind = computed<DataTableKind | undefined>(() => {
	if (route.name === BOARD_DETAILS) {
		return 'board';
	}

	if (route.query.kind === 'board' || route.query.kind === 'list') {
		return route.query.kind;
	}

	return undefined;
});

const listRouteName = computed(() => {
	const isBoard = dataTableKind.value === 'board';
	if (props.projectId) {
		return isBoard ? PROJECT_BOARDS : PROJECT_DATA_TABLES;
	}

	return isBoard ? BOARD_VIEW : DATA_TABLE_VIEW;
});

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const dataTableHasDependents = computed(() => hasDependencies(props.id));

const loading = ref(false);
const saving = ref(false);
const dataTable = ref<DataTable | null>(null);
const dataTableTableRef = ref<InstanceType<typeof DataTableTable>>();
const boardKanbanRef = ref<InstanceType<typeof BoardKanbanView>>();
const searchQuery = ref('');

const isBoardView = computed(() => (dataTableKind.value ?? dataTable.value?.kind) === 'board');

const { debounce } = useDebounce();

const listLabel = computed(() =>
	i18n.baseText(dataTableKind.value === 'board' ? 'board.boards' : 'dataTable.dataTables'),
);

const showErrorAndGoBackToList = async (error: unknown) => {
	if (!(error instanceof Error)) {
		error = new Error(String(i18n.baseText('dataTable.getDetails.error')));
	}
	toast.showError(error, i18n.baseText('dataTable.getDetails.error'));
	await router.push({
		name: listRouteName.value,
		params: { projectId: props.projectId },
	});
};

const initialize = async () => {
	loading.value = true;
	try {
		const response = await dataTableStore.fetchOrFindDataTable(
			props.id,
			props.projectId,
			dataTableKind.value,
		);
		if (response) {
			dataTable.value = response;
			documentTitle.set(`${listLabel.value} > ${response.name}`);
		} else {
			await showErrorAndGoBackToList(new Error(i18n.baseText('dataTable.notFound')));
		}
	} catch (error) {
		await showErrorAndGoBackToList(error);
	} finally {
		loading.value = false;
		void fetchDependencyCounts([props.id], 'dataTable');
	}
};

// Debounce creating new timer slightly if saving is initiated fast in succession
const debouncedSetSaving = debounce(
	(value: boolean) => {
		saving.value = value;
	},
	{ debounceTime: 50, trailing: true },
);

// Debounce hiding the saving indicator so users can see saving state
const debouncedHideSaving = debounce(
	() => {
		saving.value = false;
	},
	{ debounceTime: LOADING_ANIMATION_MIN_DURATION, trailing: true },
);

const onToggleSave = (value: boolean) => {
	if (value) {
		debouncedSetSaving(true);
	} else {
		debouncedHideSaving();
	}
};

const onAddColumn = async (column: DataTableColumnCreatePayload): Promise<AddColumnResponse> => {
	if (!dataTableTableRef.value) {
		return {
			success: false,
			errorMessage: i18n.baseText('dataTable.error.tableNotInitialized'),
		};
	}
	return await dataTableTableRef.value.addColumn(column);
};

const onCsvImported = async () => {
	if (isBoardView.value) {
		await boardKanbanRef.value?.fetchRows();
		return;
	}

	await dataTableTableRef.value?.fetchDataTableRows();
};

const onBoardStatusesUpdated = (statuses: BoardAllowedStatus[]) => {
	if (!dataTable.value) {
		return;
	}

	dataTable.value = {
		...dataTable.value,
		metadata: {
			...dataTable.value.metadata,
			allowedStatuses: statuses,
		},
	};
};

const handleSourceControlPull = async () => {
	// Bypass cache and fetch fresh data from API after pull
	loading.value = true;
	try {
		const response = await dataTableStore.fetchDataTableDetails(props.id, props.projectId);
		if (response) {
			dataTable.value = response;
			documentTitle.set(`${listLabel.value} > ${response.name}`);
		} else {
			await showErrorAndGoBackToList(new Error(i18n.baseText('dataTable.notFound')));
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.getDetails.error'));
	} finally {
		loading.value = false;
	}
};

watch(
	() => [route.name, route.query.kind, props.projectId, props.id] as const,
	async ([name, kind]) => {
		if (name !== DATA_TABLE_DETAILS || kind !== 'board') {
			return;
		}

		await router.replace({
			name: BOARD_DETAILS,
			params: {
				projectId: props.projectId,
				id: props.id,
			},
		});
	},
	{ immediate: true },
);

watch(
	() => props.id,
	async () => {
		await initialize();
	},
);

onMounted(async () => {
	documentTitle.set(listLabel.value);
	await initialize();

	sourceControlEventBus.on('pull', handleSourceControlPull);
});

onBeforeUnmount(() => {
	sourceControlEventBus.off('pull', handleSourceControlPull);
});
</script>

<template>
	<div :class="$style['data-table-details-view']" data-test-id="data-table-details-view">
		<div v-if="loading" data-test-id="data-table-details-loading">
			<N8nLoading
				variant="h1"
				:loading="true"
				:rows="1"
				:shrink-last="false"
				:class="$style['header-loading']"
			/>
			<N8nLoading :loading="true" variant="h1" :rows="10" :shrink-last="false" />
		</div>
		<div v-else-if="dataTable" :class="$style.detailsBody">
			<div :class="$style.header">
				<DataTableBreadcrumbs
					:data-table="dataTable"
					:kind="dataTableKind"
					:read-only="readOnlyEnv"
					@imported="onCsvImported"
				/>
				<div v-if="saving" :class="$style.saving">
					<N8nSpinner />
					<N8nText>{{ i18n.baseText('generic.saving') }}...</N8nText>
				</div>
				<div :class="$style.actions">
					<DependencyPill
						v-if="dataTableHasDependents"
						resource-type="dataTable"
						:resource-id="id"
						source="data_table_card"
						data-test-id="data-table-details-dependents"
					/>
					<N8nInput
						v-model="searchQuery"
						data-test-id="data-table-search-input"
						size="small"
						:class="$style.search"
						:placeholder="i18n.baseText('generic.search')"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
						<template v-if="!isBoardView" #suffix>
							<N8nTooltip placement="bottom">
								<template #content>
									{{ i18n.baseText('dataTable.search.dateSearchInfo') }}
								</template>
								<span :class="$style.infoIcon">
									<N8nIcon icon="info" size="small" />
								</span>
							</N8nTooltip>
						</template>
					</N8nInput>
					<template v-if="!isBoardView">
						<N8nButton
							data-test-id="data-table-header-add-row-button"
							:disabled="readOnlyEnv"
							@click="dataTableTableRef?.addRow"
							>{{ i18n.baseText('dataTable.addRow.label') }}</N8nButton
						>
						<AddColumnButton
							:use-text-trigger="true"
							:popover-id="'ds-details-add-column-popover'"
							:params="{ onAddColumn }"
							:disabled="readOnlyEnv"
						/>
					</template>
				</div>
			</div>
			<div :class="$style.content">
				<BoardKanbanView
					v-if="isBoardView"
					ref="boardKanbanRef"
					:data-table="dataTable"
					:search="searchQuery"
					:read-only="readOnlyEnv"
					@toggle-save="onToggleSave"
					@statuses-updated="onBoardStatusesUpdated"
				/>
				<DataTableTable
					v-else
					ref="dataTableTableRef"
					:data-table="dataTable"
					:search="searchQuery"
					:read-only="readOnlyEnv"
					@toggle-save="onToggleSave"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.data-table-details-view {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	width: 100%;
	box-sizing: border-box;
	overflow: hidden;
}

.detailsBody {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.header-loading {
	div {
		height: 2em;
	}
}

.header {
	display: flex;
	flex-shrink: 0;
	gap: var(--spacing--lg);
	align-items: center;
}

.header,
.header-loading {
	padding: var(--spacing--sm);
}

.saving {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--5xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-left: auto;
}

.search {
	max-width: 196px;
}

.content {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.infoIcon {
	display: inline-flex;
	align-items: center;
	color: var(--color--text--tint-2);
	cursor: help;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
