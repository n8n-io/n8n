<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import TestRunsTable from '@/components/TestDefinition/ListRuns/TestRunsTable.vue';
import { VIEWS } from '@/constants';

const router = useRouter();
const testDefinitionStore = useTestDefinitionStore();
const isLoading = ref(false);

const selectedMetric = ref();
const testId = computed(() => {
	return router.currentRoute.value.params.testId as string;
});

async function loadInitialData() {
	if (!isLoading.value) {
		// Add guard to prevent multiple loading states
		isLoading.value = true;
		try {
			await testDefinitionStore.fetchTestDefinition(testId.value);
			await testDefinitionStore.fetchTestRuns(testId.value);
			isLoading.value = false;
		} catch (error) {
		} finally {
			isLoading.value = false;
		}
	}
}
// TODO: We're currently doing the filtering on the FE but there should be an endpoint to get the runs for a test
const runs = computed(() => {
	return Object.values(testDefinitionStore.testRunsById ?? {}).filter(
		(run) => run.testDefinitionId === testId.value,
	);
});

const testDefinition = computed(() => {
	return testDefinitionStore.testDefinitionsById[testId.value];
});

const getRunDetail = (_run: TestRunRecord) => {
	// TODO: Implement run detail
};

onMounted(async () => {
	await loadInitialData();
});
</script>

<template>
	<div :class="$style.container">
		<router-link :to="{ name: VIEWS.TEST_DEFINITION }">
			<i class="mr-xs"><font-awesome-icon icon="arrow-left" /></i>
			<n8n-heading size="large" :bold="true">{{ testDefinition?.name }}</n8n-heading>
		</router-link>
		<N8nText :class="$style.description" size="medium">{{ testDefinition?.description }}</N8nText>
		<template v-if="isLoading">
			<N8nLoading :rows="5" />
			<N8nLoading :rows="10" />
		</template>
		<template v-else>
			<MetricsChart v-model:selectedMetric="selectedMetric" :runs="runs" />
			<TestRunsTable :runs="runs" @get-run-detail="getRunDetail" />
		</template>
	</div>
</template>
<style module lang="scss">
.container {
	padding: var(--spacing-xl) var(--spacing-l);
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
}

.description {
	margin-top: var(--spacing-xs);
	display: block;
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}
</style>
