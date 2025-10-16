<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type {
	AddColumnResponse,
	DataTable,
	DataTableColumnCreatePayload,
} from '@/features/dataTable/dataTable.types';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { DATA_TABLE_VIEW, MIN_LOADING_TIME } from '@/features/dataTable/constants';
import DataTableBreadcrumbs from '@/features/dataTable/components/DataTableBreadcrumbs.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import DataTableTable from './components/dataGrid/DataTableTable.vue';
import { useDebounce } from '@/composables/useDebounce';
import AddColumnButton from './components/dataGrid/AddColumnButton.vue';

import { N8nButton, N8nLoading, N8nSpinner, N8nText } from '@n8n/design-system';
type Props = {
	id: string;
	projectId: string;
};

const props = defineProps<Props>();

const toast = useToast();
const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();

const dataTableStore = useDataTableStore();

const loading = ref(false);
const saving = ref(false);
const dataTable = ref<DataTable | null>(null);
const dataTableTableRef = ref<InstanceType<typeof DataTableTable>>();

const { debounce } = useDebounce();

const showErrorAndGoBackToList = async (error: unknown) => {
	if (!(error instanceof Error)) {
		error = new Error(String(i18n.baseText('dataTable.getDetails.error')));
	}
	toast.showError(error, i18n.baseText('dataTable.getDetails.error'));
	await router.push({ name: DATA_TABLE_VIEW, params: { projectId: props.projectId } });
};

const initialize = async () => {
	loading.value = true;
	try {
		const response = await dataTableStore.fetchOrFindDataTable(props.id, props.projectId);
		if (response) {
			dataTable.value = response;
			documentTitle.set(`${i18n.baseText('dataTable.dataTables')} > ${response.name}`);
		} else {
			await showErrorAndGoBackToList(new Error(i18n.baseText('dataTable.notFound')));
		}
	} catch (error) {
		await showErrorAndGoBackToList(error);
	} finally {
		loading.value = false;
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
	{ debounceTime: MIN_LOADING_TIME, trailing: true },
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

onMounted(async () => {
	documentTitle.set(i18n.baseText('dataTable.dataTables'));
	await initialize();
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
		<div v-else-if="dataTable">
			<div :class="$style.header">
				<DataTableBreadcrumbs :data-table="dataTable" />
				<div v-if="saving" :class="$style.saving">
					<N8nSpinner />
					<N8nText>{{ i18n.baseText('generic.saving') }}...</N8nText>
				</div>
				<div :class="$style.actions">
					<N8nButton
						data-test-id="data-table-header-add-row-button"
						@click="dataTableTableRef?.addRow"
						>{{ i18n.baseText('dataTable.addRow.label') }}</N8nButton
					>
					<AddColumnButton
						:use-text-trigger="true"
						:popover-id="'ds-details-add-column-popover'"
						:params="{ onAddColumn }"
					/>
				</div>
			</div>
			<div :class="$style.content">
				<DataTableTable
					ref="dataTableTableRef"
					:data-table="dataTable"
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
	width: 100%;
	box-sizing: border-box;
	align-content: start;
}

.header-loading {
	div {
		height: 2em;
	}
}

.header {
	display: flex;
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
	gap: var(--spacing--3xs);
	margin-left: auto;
}
</style>
