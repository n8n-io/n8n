<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import TestRunsTable from '@/components/TestDefinition/ListRuns/TestRunsTable.vue';

const router = useRouter();
const testDefinitionStore = useTestDefinitionStore();
const isLoading = ref(false);

const selectedMetric = ref();
async function loadInitialData() {
	if (!isLoading.value) {
		// Add guard to prevent multiple loading states
		isLoading.value = true;
		try {
			await testDefinitionStore.fetchTestRuns(router.currentRoute.value.params.testId as string);
			isLoading.value = false;
		} catch (error) {
		} finally {
			isLoading.value = false;
		}
	}
}

const runs = computed(() => {
	return Object.values(testDefinitionStore.testRunsById ?? {}).filter(
		(run) => run.testDefinitionId === router.currentRoute.value.params.testId,
	);
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
		<MetricsChart v-model:selectedMetric="selectedMetric" :runs="runs" />
		<TestRunsTable :runs="runs" @get-run-detail="getRunDetail" />
	</div>
</template>
<style module lang="scss">
.container {
	padding: var(--spacing-xl) var(--spacing-l);
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
}
.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}
</style>
