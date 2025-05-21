<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { makeRestApiRequest } from '@/utils/apiUtils';
import type { Datastore } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useRoute } from 'vue-router';
import type { DatatableColumn, DatatableRow } from '@n8n/design-system';
import { N8nDatatable } from '@n8n/design-system';

const rootStore = useRootStore();

type DataStoreRecord = Record<string, unknown> & { id: string };

const store = ref<Datastore>();
const records = ref<DataStoreRecord[]>([]);
const isLoading = ref(false);
const route = useRoute();

const storeId = computed(() => {
	return route.params.id as string;
});

async function getStore() {
	const response = await makeRestApiRequest<Datastore>(
		rootStore.restApiContext,
		'GET',
		`/datastores/${storeId.value}`,
	);

	return response;
}

async function getRecords() {
	const response = await makeRestApiRequest<DataStoreRecord[]>(
		rootStore.restApiContext,
		'GET',
		`/datastores/${storeId.value}/records`,
	);

	return response;
}

const headers = computed<DatatableColumn[]>(() => {
	return (
		store.value?.fields.map(
			(field): DatatableColumn => ({
				id: field.name,
				path: field.name,
				label: field.name,
			}),
		) ?? []
	);
});

onMounted(async () => {
	store.value = await getStore();
	records.value = await getRecords();
});
</script>

<template>
	<PageViewLayout v-if="store">
		<!-- <N8nDataTableServer
			:sort-by="[{ id: 'id', desc: false }]"
			:page="0"
			:items-per-page="10"
			:items="records"
			:headers="headers"
			:items-length="records.length"
		>
		</N8nDataTableServer> -->

		<template #header>
			<N8nHeading tag="h2" bold size="medium" class="mb-s">
				{{ store.name }}
			</N8nHeading>
		</template>

		<div>
			<N8nDatatable :columns="headers" :rows="records as DatatableRow[]" :pagination="false">
			</N8nDatatable>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module></style>
