<script setup lang="ts">
/**
 * Container for the agent's eval surface: the first-run state until a dataset
 * exists, then the review card for its newest run.
 *
 * Owns which run is shown. There is no run picker yet, so it resolves the newest
 * run of the newest dataset itself rather than depending on a list view.
 */
import { computed, onMounted, ref, watch } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useTestAgentPreviewExperiment } from '@/experiments/testAgentPreview/useTestAgentPreviewExperiment';
import { useAgentEvalsStore } from '../agentEvals.store';
import { isDataTableDataset, resolveCaseColumns } from '../utils/agentEvalCases.utils';
import AgentEvalCasesCard from './AgentEvalCasesCard.vue';
import AgentEvalChecksPanel from './AgentEvalChecksPanel.vue';
import AgentEvalResultsPanel from './AgentEvalResultsPanel.vue';
import AgentEvalsEmptyStatePreview from './AgentEvalsEmptyStatePreview.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	/** No `agent:update` — cases render but nothing can be changed. */
	disabled?: boolean;
	/** `agent:execute`, which a viewer holds without holding update. */
	canRun?: boolean;
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
const { isFeatureEnabled: showEmptyStatePreview } = useTestAgentPreviewExperiment();

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
// The card writes Data Table rows, so it only accepts a dataset backed by one.
const caseDataset = computed(() =>
	dataset.value && isDataTableDataset(dataset.value) ? dataset.value : null,
);

// The experiment's empty-state preview generates a full batch of 10 up front
// (same as the instanceAi test-agent-preview flow), but with `save: false` —
// nothing is persisted, so refreshing the page before committing to any of
// them leaves no half-finished dataset behind. Own-added examples are kept
// the same way, purely in memory, until "Add checks" commits the lot.
const previewCases = ref<AgentEvalDraftCase[]>([]);
const previewOwnExamples = ref<string[]>([]);
const hasPreview = computed(() => previewCases.value.length > 0);
const addingChecks = ref(false);
// True while the preview's LLM call is in flight — kept separate from
// `hasSettled` so this surface doesn't have to blank the whole section behind
// a skeleton for it; only the examples slider shows a loader meanwhile.
const generatingPreview = ref(false);

// Bumped by `load()` on every call, including agent switches: `loadPreview`
// captures the current value and checks it again after its `await`, so a
// generation started for the previous agent can't write its result (or error
// toast) into the new agent's preview once it finally resolves.
let previewRequestId = 0;

const loadPreview = async () => {
	if (hasPreview.value || generatingPreview.value) return;
	const requestId = previewRequestId;
	generatingPreview.value = true;
	try {
		const result = await store.generateDraftCases(props.projectId, props.agentId, {
			count: 10,
			save: false,
		});
		if (requestId !== previewRequestId) return;
		previewCases.value = result.cases;
	} catch (error) {
		if (requestId !== previewRequestId) return;
		// Degrades to the plain "Generate test cases" card — a failed preview
		// generation shouldn't block the regular path forward.
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.generateError'));
	} finally {
		if (requestId === previewRequestId) generatingPreview.value = false;
	}
};

const load = async () => {
	// Invalidates any preview generation still in flight for whichever agent
	// was showing before, and clears its result — switching agents must not
	// display (or let "Add checks" commit) the previous agent's preview.
	previewRequestId += 1;
	previewCases.value = [];
	previewOwnExamples.value = [];
	generatingPreview.value = false;

	if (!props.agentId || props.agentUnsaved) {
		hasSettled.value = true;
		return;
	}

	hasSettled.value = false;
	try {
		const fetched = await store.fetchDatasets(props.projectId, props.agentId);
		const newest = fetched[0];
		if (!newest) {
			// Not awaited: the preview's own generation can take a few seconds, and
			// nothing else in `load()` depends on it — settling here lets the
			// section render immediately instead of sitting behind a blank skeleton
			// for the whole generation.
			if (showEmptyStatePreview.value) void loadPreview();
			return;
		}
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

/** "Add your own example" from the preview slider: kept in memory only —
 *  nothing is persisted until "Add checks" commits the whole batch. */
const onAddPreviewExample = (input: string) => {
	previewOwnExamples.value = [...previewOwnExamples.value, input];
};

/**
 * Commits the preview: creates a real (empty) dataset, inserts the slider's
 * selected generated cases plus every self-written one as rows, runs the
 * agent over them, then reloads — which switches the view from the preview
 * straight to the run's results, same as the instanceAi flow's "Check your
 * agent". Nothing from the preview is persisted before this point.
 */
const onAddChecks = async (count: number) => {
	addingChecks.value = true;
	// Tracked outside the try so the catch block can tell "nothing was created
	// yet" apart from "created, but the commit failed partway through" — only
	// the latter has anything to roll back.
	let createdDatasetId: string | undefined;
	// Once `startRun` has been sent, a failure is ambiguous: the request may
	// have reached the server and seeded a real run before the response itself
	// failed or timed out. Rolling back past this point would delete that run
	// and its results along with the dataset — so rollback is only for
	// failures strictly before submission, where nothing has been seeded yet.
	let runSubmitted = false;
	try {
		const created = await store.createDraftDataset(props.projectId, props.agentId);
		createdDatasetId = created.datasetId;
		// Resolved straight from the create response — not a `getDatasets` refetch,
		// which could itself fail transiently after the dataset already exists and
		// send a retry into creating a second, duplicate empty dataset.
		const columns = resolveCaseColumns(created.columnMapping);
		if (!columns) throw new Error('The draft dataset has no writable case columns');
		const source = { datasetId: created.datasetId, dataTableId: created.dataTableId, columns };

		const toCreate = [
			...previewCases.value
				.slice(0, count)
				.map((c) => ({ input: c.input, whatToCheck: c.whatToCheck })),
			...previewOwnExamples.value.map((input) => ({ input, whatToCheck: '' })),
		];
		await Promise.all(toCreate.map((value) => store.createCase(props.projectId, source, value)));

		runSubmitted = true;
		await store.startRun(props.projectId, props.agentId, created.datasetId);
		await load();
	} catch (error) {
		if (createdDatasetId && !runSubmitted) {
			// A partial insert leaves a persisted-but-incomplete dataset behind —
			// delete it rather than let a retry pile up another one alongside it.
			await store
				.deleteDraftDataset(props.projectId, props.agentId, createdDatasetId)
				.catch(() => null);
		}
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.run.startError'));
	} finally {
		addingChecks.value = false;
	}
};

onMounted(load);
watch(() => props.agentId, load);
</script>

<template>
	<div :class="$style.section" data-testid="agent-evals-section">
		<N8nLoading v-if="awaitingDatasets" :rows="4" data-testid="agent-evals-loading" />

		<AgentEvalChecksPanel
			v-else-if="dataset && runId && showEmptyStatePreview"
			:project-id="projectId"
			:agent-id="agentId"
			:run-id="runId"
			:disabled="disabled"
			:rerunning="store.isStartingRun(dataset.id)"
			@rerun="onRerun"
		/>

		<AgentEvalResultsPanel
			v-else-if="dataset && runId"
			:project-id="projectId"
			:agent-id="agentId"
			:run-id="runId"
			:disabled="disabled"
			:rerunning="store.isStartingRun(dataset.id)"
			@rerun="onRerun"
		/>

		<!-- A dataset with no run yet: the drafted cases, where they can be reviewed,
		     edited and run. TRUST-291 defines this component as the container both views
		     mount into; running a set is the case list's, per TRUST-292. -->
		<AgentEvalCasesCard
			v-else-if="dataset && caseDataset"
			:key="`${projectId}:${agentId}:${caseDataset.id}`"
			:project-id="projectId"
			:agent-id="agentId"
			:dataset="caseDataset"
			:disabled="disabled"
			:can-run="canRun"
			:generating="generating"
			@regenerate="emit('generate')"
		/>

		<!-- A dataset whose rows this view cannot read (a connected source). Falling
		     through to "no test cases yet" would be untrue. -->
		<N8nCallout v-else-if="dataset" theme="info" data-testid="agent-evals-external-source">
			{{ i18n.baseText('agents.builder.agentEvals.external.description') }}
		</N8nCallout>

		<AgentEvalsEmptyStatePreview
			v-else-if="showEmptyStatePreview && (generatingPreview || hasPreview)"
			:examples="previewCases"
			:loading="generatingPreview"
			:adding-checks="addingChecks"
			:disabled="disabled"
			@add-example="onAddPreviewExample"
			@add-checks="onAddChecks"
		/>

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
