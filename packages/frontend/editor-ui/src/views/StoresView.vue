<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import ResourcesListLayout, {
	type StoreResource,
} from '@/components/layouts/ResourcesListLayout.vue';

import { makeRestApiRequest } from '@/utils/apiUtils';
import type { Datastore } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

const rootStore = useRootStore();

type Store = Datastore & { resourceType: 'store' };

const stores = ref<Store[]>([]);
const isLoading = ref(false);

async function getStores() {
	isLoading.value = true;
	const response = await makeRestApiRequest<Datastore[]>(
		rootStore.restApiContext,
		'GET',
		'/datastores',
	).finally(() => {
		isLoading.value = false;
	});

	return response;
}

function addStore() {
	console.log('Add Store clicked');
	// Logic to add a new store
}

onMounted(async () => {
	stores.value = (await getStores()).map((store) => ({
		...store,
		resourceType: 'store',
		fieldCount: store.fields.length,
	}));
});
</script>

<template>
	<ResourcesListLayout
		resource-key="stores"
		type="list-full"
		:disabled="false"
		:resources="stores"
		:type-props="{ itemSize: 80 }"
		:loading="isLoading"
		:resources-refreshing="isLoading"
		:dont-perform-sorting-and-filtering="true"
		@click:add="addStore"
	>
		<template #item="{ item: data }">
			<StoreCard :data="data as StoreResource" />
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" scoped>
.action-buttons {
	opacity: 0;
	transition: opacity 0.2s ease;
}

:deep(.datatable) {
	white-space: nowrap;

	table tr {
		&:hover {
			.action-buttons {
				opacity: 1;
			}
		}
	}

	@media screen and (max-width: $breakpoint-sm) {
		table tr th:nth-child(3),
		table tr td:nth-child(3) {
			display: none;
		}
	}

	.variables-actions-column {
		width: 170px;
	}
}
</style>
