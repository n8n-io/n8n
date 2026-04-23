import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import * as scenarioRunnerApi from './scenarioRunner.api';

type RunStatus = 'idle' | 'running' | 'succeeded' | 'failed';

/**
 * State for the scenario-runner prototype. Intentionally narrow: one active run
 * per store, no history. We're measuring whether the interaction is useful
 * before investing in persistence.
 */
export const useScenarioRunnerStore = defineStore(STORES.SCENARIO_RUNNER, () => {
	const rootStore = useRootStore();

	const status = ref<RunStatus>('idle');
	const result = ref<InstanceAiEvalExecutionResult | null>(null);
	const errorMessage = ref<string | null>(null);
	const durationMs = ref<number | null>(null);
	const lastScenarioHints = ref<string>('');

	const isRunning = computed(() => status.value === 'running');
	const hasResult = computed(() => result.value !== null);

	function reset() {
		status.value = 'idle';
		result.value = null;
		errorMessage.value = null;
		durationMs.value = null;
	}

	function setScenarioText(text: string) {
		lastScenarioHints.value = text;
	}

	async function runScenario(workflowId: string, scenarioHints: string) {
		status.value = 'running';
		result.value = null;
		errorMessage.value = null;
		durationMs.value = null;
		lastScenarioHints.value = scenarioHints;

		const startedAt = performance.now();
		try {
			const response = await scenarioRunnerApi.executeWithScenario(
				rootStore.restApiContext,
				workflowId,
				scenarioHints || undefined,
			);
			result.value = response;
			status.value = response.success ? 'succeeded' : 'failed';
		} catch (error) {
			errorMessage.value = error instanceof Error ? error.message : String(error);
			status.value = 'failed';
		} finally {
			durationMs.value = Math.round(performance.now() - startedAt);
		}
	}

	return {
		status,
		result,
		errorMessage,
		durationMs,
		lastScenarioHints,
		isRunning,
		hasResult,
		runScenario,
		reset,
		setScenarioText,
	};
});
