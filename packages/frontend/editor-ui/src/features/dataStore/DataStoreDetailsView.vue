<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { DataStoreEntity } from '@/features/dataStore/datastore.types';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { DATA_STORE_VIEW } from '@/features/dataStore/constants';
import DataStoreBreadcrumbs from '@/features/dataStore/components/DataStoreBreadcrumbs.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';

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
const dataStore = ref<DataStoreEntity | null>(null);

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
		} else {
			await showErrorAndGoBackToList(new Error(i18n.baseText('dataStore.notFound')));
		}
	} catch (error) {
		await showErrorAndGoBackToList(error);
	} finally {
		loading.value = false;
	}
};

const onAddColumnClick = () => {
	toast.showMessage({
		type: 'warning',
		message: 'Coming soon',
		duration: 3000,
	});
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('dataStore.dataStores'));
	await initialize();
});
</script>

<template>
	<div :class="$style['data-store-details-view']">
		<div v-if="loading" class="loading">
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
			</div>
			<div :class="$style.content">
				<n8n-action-box
					v-if="dataStore.columns.length === 0"
					data-test-id="empty-shared-action-box"
					:heading="i18n.baseText('dataStore.noColumns.heading')"
					:description="i18n.baseText('dataStore.noColumns.description')"
					:button-text="i18n.baseText('dataStore.noColumns.button.label')"
					button-type="secondary"
					@click:button="onAddColumnClick"
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
	max-width: var(--content-container-width);
	box-sizing: border-box;
	align-content: start;
	padding: var(--spacing-l) var(--spacing-2xl) 0;
}

.header-loading {
	margin-bottom: var(--spacing-xl);

	div {
		height: 2em;
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-xl);
}
</style>
