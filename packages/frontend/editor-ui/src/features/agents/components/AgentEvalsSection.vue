<script setup lang="ts">
/**
 * Container for the agent's eval surface: the first-run state until a dataset
 * exists, then the review card for its newest run.
 *
 * Owns which run is shown. There is no run picker yet, so it resolves the newest
 * run of the newest dataset itself rather than depending on a list view.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useAgentEvalsStore } from '../agentEvals.store';
import AgentEvalResultsPanel from './AgentEvalResultsPanel.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	disabled?: boolean;
	generating?: boolean;
	/** An unsaved agent has no row to read evals from, so nothing is fetched. */
	agentUnsaved?: boolean;
}>();

const emit = defineEmits<{
	generate: [];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useAgentEvalsStore();

const datasets = computed(() => store.getDatasets(props.agentId));
// Datasets come back newest-first, and generation makes exactly one; a picker is
// the case-list view's to add.
const dataset = computed(() => datasets.value[0]);
/**
 * False until the read for the current agent has finished — either way. Keyed on
 * the attempt rather than on `isLoaded`, because a *failed* read never populates
 * the cache: reading `isLoaded` alone leaves the skeleton up for good once the
 * toast has gone, with nothing to retry from. An agent with no row yet is never
 * fetched for at all, so it is settled from the start.
 */
const hasSettled = ref(false);

const awaitingDatasets = computed(() => !hasSettled.value);
const runId = computed(() => (dataset.value ? store.getLatestRunId(dataset.value.id) : undefined));

const load = async () => {
	if (!props.agentId || props.agentUnsaved) {
		hasSettled.value = true;
		return;
	}

	hasSettled.value = false;
	try {
		const fetched = await store.fetchDatasets(props.projectId, props.agentId);
		const newest = fetched[0];
		if (!newest) return;
		await store.resolveLatestRunId(props.projectId, props.agentId, newest.id);
	} catch (error) {
		// Degrades to the first-run state rather than a permanent skeleton: with no
		// datasets to show, offering to generate is still the right next step.
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.loadError'));
	} finally {
		hasSettled.value = true;
	}
};

const onRerun = async () => {
	if (!dataset.value) return;
	try {
		await store.startRun(props.projectId, props.agentId, dataset.value.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunError'));
	}
};

onMounted(load);
watch(() => props.agentId, load);
</script>

<template>
	<div :class="$style.section" data-testid="agent-evals-section">
		<N8nLoading v-if="awaitingDatasets" :rows="4" data-testid="agent-evals-loading" />

		<AgentEvalResultsPanel
			v-else-if="dataset && runId"
			:project-id="projectId"
			:agent-id="agentId"
			:run-id="runId"
			:disabled="disabled"
			:rerunning="store.isStartingRun(dataset.id)"
			@rerun="onRerun"
		/>

		<!-- A dataset exists but has never run. The case list owns running a set the
		     user has just edited; this offers the same action for the plain case of
		     cases that exist and have never been tried. -->
		<div v-else-if="dataset" :class="$style.emptyState" data-testid="agent-eval-no-runs">
			<div :class="$style.iconBadge">
				<N8nIcon icon="sparkles" size="xlarge" />
			</div>
			<N8nText tag="h3" size="large" color="text-dark" bold :class="$style.title">
				{{ i18n.baseText('agents.builder.agentEvals.review.noRuns.title') }}
			</N8nText>
			<N8nText size="medium" color="text-base" :class="$style.description">
				{{ i18n.baseText('agents.builder.agentEvals.review.noRuns.description') }}
			</N8nText>
			<N8nButton
				variant="solid"
				size="large"
				type="button"
				icon="play"
				:disabled="disabled"
				:loading="store.isStartingRun(dataset.id)"
				data-testid="agent-eval-run-cases-button"
				@click="onRerun"
			>
				{{ i18n.baseText('agents.builder.agentEvals.review.noRuns.run') }}
			</N8nButton>
		</div>

		<div v-else :class="$style.emptyState" data-testid="agent-evals-empty-state">
			<div :class="$style.iconBadge">
				<N8nIcon icon="sparkles" size="xlarge" />
			</div>
			<N8nText tag="h3" size="large" color="text-dark" bold :class="$style.title">
				{{ i18n.baseText('agents.builder.agentEvals.empty.title') }}
			</N8nText>
			<N8nText size="medium" color="text-base" :class="$style.description">
				{{ i18n.baseText('agents.builder.agentEvals.empty.description') }}
			</N8nText>
			<N8nButton
				variant="solid"
				size="large"
				type="button"
				icon="sparkles"
				:disabled="disabled"
				:loading="generating"
				data-testid="agent-evals-generate-button"
				@click="emit('generate')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.empty.generate') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
}

/* Vertical rhythm is a single uniform gap, matching the design — no per-child
   margins, so adding the case list later can't inherit odd spacing. */
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--2xl) var(--spacing--lg);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius);
	text-align: center;
}

.iconBadge {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xs);
	color: var(--color--text);
	background-color: var(--background--active);
	border-radius: var(--radius);
}

.title {
	margin: 0;
}

/* Caps the measure at the design's 400px so the copy wraps to three lines
   instead of stretching the full panel width. */
.description {
	display: block;
	max-width: 25rem;
}
</style>
