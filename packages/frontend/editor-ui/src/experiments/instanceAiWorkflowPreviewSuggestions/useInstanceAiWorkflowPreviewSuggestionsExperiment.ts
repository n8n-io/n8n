import { computed } from 'vue';

// Experiment cleanup : remove with InstanceAiWorkflowPreviewSuggestionsExperiment
export function useInstanceAiWorkflowPreviewSuggestionsExperiment() {
	const isFeatureEnabled = computed(() => true);

	return { isFeatureEnabled };
}
