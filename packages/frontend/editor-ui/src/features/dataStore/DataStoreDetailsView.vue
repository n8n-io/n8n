<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type {
	AddColumnResponse,
	DataStore,
	DataStoreColumnCreatePayload,
} from '@/features/dataStore/datastore.types';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { DATA_STORE_VIEW, MIN_LOADING_TIME } from '@/features/dataStore/constants';
import DataStoreBreadcrumbs from '@/features/dataStore/components/DataStoreBreadcrumbs.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import DataStoreTable from './components/dataGrid/DataStoreTable.vue';
import { useDebounce } from '@/composables/useDebounce';
import AddColumnButton from './components/dataGrid/AddColumnButton.vue';

type Props = {
	id: string;
	projectId: string;
};

const props = defineProps<Props>();

const toast = useToast();
const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();

const dataStoreStore = useDataStoreStore();

const loading = ref(false);
const saving = ref(false);
const dataStore = ref<DataStore | null>(null);
const dataStoreTableRef = ref<InstanceType<typeof DataStoreTable>>();

const { debounce } = useDebounce();

const showErrorAndGoBackToList = async (error: unknown) => {
	if (!(error instanceof Error)) {
		error = new Error(String(i18n.baseText('dataStore.getDetails.error')));
	}
	toast.showError(error, i18n.baseText('dataStore.getDetails.error'));
	await router.push({ name: DATA_STORE_VIEW, params: { projectId: props.projectId } });
};

const initialize = async () => {
	loading.value = true;
	try {
		const response = await dataStoreStore.fetchOrFindDataStore(props.id, props.projectId);
		if (response) {
			dataStore.value = response;
			documentTitle.set(`${i18n.baseText('dataStore.dataStores')} > ${response.name}`);
		} else {
			await showErrorAndGoBackToList(new Error(i18n.baseText('dataStore.notFound')));
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

const onAddColumn = async (column: DataStoreColumnCreatePayload): Promise<AddColumnResponse> => {
	if (!dataStoreTableRef.value) {
		return {
			success: false,
			errorMessage: i18n.baseText('dataStore.error.tableNotInitialized'),
		};
	}
	return await dataStoreTableRef.value.addColumn(column);
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('dataStore.dataStores'));
	await initialize();
});
</script>

<template>
	<div :class="$style['data-store-details-view']">
		<div v-if="loading" data-test-id="data-store-details-loading">
			<n8n-loading
				variant="h1"
				:loading="true"
				:rows="1"
				:shrink-last="false"
				:class="$style['header-loading']"
			/>
			<n8n-loading :loading="true" variant="h1" :rows="10" :shrink-last="false" />
		</div>
		<div v-else-if="dataStore">
			<div :class="$style.header">
				<DataStoreBreadcrumbs :data-store="dataStore" />
				<div v-if="saving" :class="$style.saving">
					<n8n-spinner />
					<n8n-text>{{ i18n.baseText('generic.saving') }}...</n8n-text>
				</div>
				<div :class="$style.actions">
					<n8n-button @click="dataStoreTableRef?.addRow">{{
						i18n.baseText('dataStore.addRow.label')
					}}</n8n-button>
					<AddColumnButton
						:use-text-trigger="true"
						:popover-id="'ds-details-add-column-popover'"
						:params="{ onAddColumn }"
					/>
				</div>
			</div>
			<div :class="$style.content">
				<DataStoreTable
					ref="dataStoreTableRef"
					:data-store="dataStore"
					@toggle-save="onToggleSave"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.data-store-details-view {
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
	gap: var(--spacing-l);
	align-items: center;
}

.header,
.header-loading {
	padding: var(--spacing-s);
}

.saving {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	margin-top: var(--spacing-5xs);
}

.actions {
	display: flex;
	gap: var(--spacing-3xs);
	margin-left: auto;
}
</style>
