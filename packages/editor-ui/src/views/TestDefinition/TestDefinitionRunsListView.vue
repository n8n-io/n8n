<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import TestRunsTable from '@/components/TestDefinition/ListRuns/TestRunsTable.vue';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useMessage } from '@/composables/useMessage';

const router = useRouter();
const testDefinitionStore = useTestDefinitionStore();
const uiStore = useUIStore();
const locale = useI18n();
const toast = useToast();

const selectedMetric = ref();
const isLoading = ref(false);

const appliedTheme = computed(() => uiStore.appliedTheme);
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

const getRunDetail = (run: TestRunRecord) => {
	void router.push({
		name: VIEWS.TEST_DEFINITION_RUNS_DETAIL,
		params: { testId: testId.value, runId: run.id },
	});
};

async function runTest() {
	try {
		const result = await testDefinitionStore.startTestRun(testId.value);
		if (result.success) {
			toast.showMessage({
				title: locale.baseText('testDefinition.list.testStarted'),
				type: 'success',
			});

			// Optionally fetch the updated test runs
			await testDefinitionStore.fetchTestRuns(testId.value);
		} else {
			throw new Error('Test run failed to start');
		}
	} catch (error) {
		toast.showError(error, locale.baseText('testDefinition.list.testStartError'));
	}
}

async function onDeleteRuns(runsToDelete: TestRunRecord[]) {
	const { confirm } = useMessage();

	const deleteConfirmed = await confirm(locale.baseText('testDefinition.deleteTest'), {
		type: 'warning',
		confirmButtonText: locale.baseText(
			'settings.log-streaming.destinationDelete.confirmButtonText',
		),
		cancelButtonText: locale.baseText('settings.log-streaming.destinationDelete.cancelButtonText'),
	});

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}
	await Promise.all(
		runsToDelete.map(async (run) => {
			await testDefinitionStore.deleteTestRun({ testDefinitionId: testId.value, runId: run.id });
		}),
	);
}

onMounted(async () => {
	await loadInitialData();
});
</script>

<template>
	<div :class="$style.container">
		<router-link :to="{ name: VIEWS.TEST_DEFINITION }" :class="$style.backButton">
			<i class="mr-xs"><font-awesome-icon icon="arrow-left" /></i>
			<n8n-heading size="large" :bold="true">{{ testDefinition?.name }}</n8n-heading>
		</router-link>
		<N8nText :class="$style.description" size="medium">{{ testDefinition?.description }}</N8nText>
		<template v-if="isLoading">
			<N8nLoading :rows="5" />
			<N8nLoading :rows="10" />
		</template>
		<div v-else-if="runs.length > 0" :class="$style.details">
			<MetricsChart v-model:selectedMetric="selectedMetric" :runs="runs" :theme="appliedTheme" />
			<TestRunsTable :runs="runs" @get-run-detail="getRunDetail" @delete-runs="onDeleteRuns" />
		</div>
		<template v-else>
			<N8nActionBox
				:heading="locale.baseText('testDefinition.listRuns.noRuns')"
				:description="locale.baseText('testDefinition.listRuns.noRuns.description')"
				:button-text="locale.baseText('testDefinition.listRuns.noRuns.button')"
				@click:button="runTest"
			/>
		</template>
	</div>
</template>
<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
	margin: auto;
	display: flex;
	flex-direction: column;
}
.backButton {
	color: var(--color-text-base);
}
.description {
	margin: var(--spacing-s) 0;
	display: block;
}
.details {
	display: flex;
	height: 100%;
	flex-direction: column;
	gap: var(--spacing-xl);
}
</style>
