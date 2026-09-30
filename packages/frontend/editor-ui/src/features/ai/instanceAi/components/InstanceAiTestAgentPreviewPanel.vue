<script setup lang="ts">
/**
 * Post-setup suggestion to test the agent that was just built — the preview
 * variant. Instead of a generic "want to test this?" offer, it shows a real
 * input/output pair before asking whether it looks right — reusing the
 * builder's own test run when one exists (`initialCase`), otherwise
 * generating and running one case of its own. Behind the
 * `INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT` flag, alongside the original
 * `InstanceAiTestAgentPanel`.
 */
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import type { AgentEvalDraftCase, AgentEvalResultStatus } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nInput, N8nSpinner, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import type { AgentEvalCase } from '@/features/agents/agentEvals.types';
import { readAgentAnswer, readCaseRequest } from '@/features/agents/utils/agent-eval-review';
import { isDataTableDataset, toCaseSource } from '@/features/agents/utils/agentEvalCases.utils';
import type { AgentAvatarKind } from '@/features/agents/components/AgentAvatar.vue';
import EvalInitialSample from '@/features/agents/components/EvalInitialSample.vue';
import InstanceAiTestAgentExamplesPanel, {
	type SuiteCaseRun,
} from './InstanceAiTestAgentExamplesPanel.vue';
import CapabilityChip from '@/features/agents/components/CapabilityChip.vue';

/** How a settled result's status reads as a row's avatar state. */
function resultStatusToKind(status: AgentEvalResultStatus): AgentAvatarKind {
	switch (status) {
		case 'success':
			return 'pass';
		case 'error':
			return 'fail';
		case 'cancelled':
			return 'work';
		case 'new':
		case 'running':
			return 'waiting';
	}
}

const props = defineProps<{
	target: { agentId: string; projectId: string };
	/**
	 * A real input/output pair from the agent builder's own "Testing agent"
	 * step, when one exists. Shown directly instead of generating and running
	 * a fresh case, since the builder already ran an equivalent test.
	 */
	initialCase?: { message: string; response: string } | null;
}>();

const emit = defineEmits<{
	confirm: [];
	dismiss: [];
	'open-evals': [];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useAgentEvalsStore();

type Phase =
	| 'generating-preview'
	| 'awaiting-confirmation'
	| 'awaiting-sample-input'
	| 'generating-suite'
	| 'suite-ready';
// Skips straight to the confirmation state when the builder already ran an
// equivalent test — there is nothing to generate or wait on.
const phase = ref<Phase>(props.initialCase ? 'awaiting-confirmation' : 'generating-preview');
const previewRunId = ref<string | null>(null);
const suiteCases = ref<AgentEvalDraftCase[]>([]);
// Frozen once the suite is generated — `suiteCases` itself keeps growing as the
// user adds their own examples, so this is the only record of how many of its
// entries are the generated batch the slider trims, versus the user's own.
const generatedCaseCount = ref(0);
const suiteDatasetId = ref<string | null>(null);
const addingExample = ref(false);
// Null until "Check your agent" has trimmed the dataset to its cap — set, it
// replaces the slider/editor view with each case's live run status.
const suiteCaseRows = ref<AgentEvalCase[] | null>(null);
const suiteRunId = ref<string | null>(null);
const startingSuiteRun = ref(false);
const stoppingSuiteRun = ref(false);
const sampleInput = ref('');
// Cleared once the user submits their own sample, so the display switches
// over to that new run instead of sticking with the builder's original test.
const useInitialCase = ref(Boolean(props.initialCase));
// The generated preview case's scenario tag. Null when reusing the builder's
// own test result (`initialCase`), which was never scenario-generated.
const previewScenario = ref<string | null>(null);

const previewResult = computed(() =>
	previewRunId.value ? store.getReview(previewRunId.value).results[0] : undefined,
);
const previewInput = computed(() =>
	useInitialCase.value
		? (props.initialCase?.message ?? '')
		: readCaseRequest(previewResult.value?.input),
);
const previewOutput = computed(() =>
	useInitialCase.value
		? (props.initialCase?.response ?? '')
		: readAgentAnswer(previewResult.value?.output ?? null),
);

// Each row's live state: "waiting" until its case has a settled result, then
// the outcome the result recorded. Kept as one derived list rather than
// mutated in place, so a case update never has to be reconciled by hand.
const suiteCaseRuns = computed<SuiteCaseRun[] | null>(() => {
	const rows = suiteCaseRows.value;
	if (!rows) return null;
	const results = suiteRunId.value ? store.getReview(suiteRunId.value).results : [];
	return rows.map((row) => {
		const result = results.find((r) => r.sourceRowId === String(row.rowId));
		if (!result || result.status === 'new' || result.status === 'running') {
			return { rowId: row.rowId, input: row.input, status: 'waiting', output: null };
		}
		return {
			rowId: row.rowId,
			input: row.input,
			status: resultStatusToKind(result.status),
			output: readAgentAnswer(result.output),
		};
	});
});

// Not reactive by design — nothing templates off it. It only guards async
// continuations against acting after the panel is gone, since the store's
// poll timer is a single global watcher: a stale continuation calling
// `startPollingRun` would cancel whatever the next thread's panel just started.
let isMounted = true;

function failAndDismiss(error: unknown) {
	if (!isMounted) return;
	toast.showError(error, i18n.baseText('agents.builder.agentEvals.generateError'));
	emit('dismiss');
}

// Overwrites the freshly generated case's request with the user's own text,
// keeping its AI-authored grading criteria — there is no endpoint to create a
// dataset from a literal input directly, and the criteria isn't shown or used
// anywhere in this panel, only the request and its answer are.
async function applyCustomInput(
	projectId: string,
	agentId: string,
	datasetId: string,
	input: string,
) {
	const dataset = store.getDatasets(agentId).find((d) => d.id === datasetId);
	const source = dataset && isDataTableDataset(dataset) ? toCaseSource(dataset) : null;
	if (!source) return;
	const cases = await store.fetchCases(projectId, source);
	if (!isMounted) return;
	const existing = cases[0];
	if (!existing) return;
	await store.updateCase(projectId, source, existing.rowId, {
		input,
		whatToCheck: existing.whatToCheck,
	});
}

async function runGeneratedPreview(customInput?: string) {
	try {
		const { projectId, agentId } = props.target;
		const result = await store.generateDraftCases(projectId, agentId, { count: 1 });
		if (!isMounted) return;
		previewScenario.value = result.cases[0]?.scenario ?? null;
		if (customInput) {
			await applyCustomInput(projectId, agentId, result.datasetId, customInput);
			if (!isMounted) return;
		}
		const run = await store.startRun(projectId, agentId, result.datasetId);
		if (!isMounted) return;
		previewRunId.value = run.id;
		await store.openRun(projectId, agentId, run.id);
		if (!isMounted) return;
		if (store.isRunInFlight(run.id)) {
			store.startPollingRun(projectId, agentId, run.id);
		}
	} catch (error) {
		failAndDismiss(error);
	}
}

function generatePreviewCase() {
	if (props.initialCase) return;
	return runGeneratedPreview();
}

// Reactive rather than a promise chain: `startPollingRun` self-schedules and
// never resolves, so settlement can only be observed through the store's
// reactive state — same pattern `AgentEvalResultsPanel` uses.
function checkPreviewSettled() {
	if (phase.value !== 'generating-preview') return;
	if (!previewRunId.value) return;
	if (store.hasLostTrackOfRun(previewRunId.value)) {
		failAndDismiss(new Error('Lost track of the preview run'));
		return;
	}
	// `getReview` returns an empty review (`run: null`) before `openRun` has
	// loaded anything — that empty state is not "in flight" either, so without
	// this check the watcher would confirm on a preview that never loaded.
	const review = store.getReview(previewRunId.value);
	if (!review.run) return;
	// Deliberately not gated on `isRunInFlight` (the run's own status): the
	// store's poll updates `run.status` to its settled value in one patch, then
	// refreshes `results` in a second, later patch (`pollRunOnce` calls
	// `settleRun` only after that first patch). Reading here in between would
	// see a settled run next to a still-pending case and misreport failure.
	// The case's own status is the only thing that tells us it is done.
	const resultStatus = review.results[0]?.status;
	if (resultStatus === undefined || resultStatus === 'new' || resultStatus === 'running') return;
	// A settled case can still fail — an error/cancelled case has no answer to
	// confirm, so it gets the same treatment as losing track of the run.
	if (resultStatus !== 'success') {
		failAndDismiss(new Error('Preview run did not complete successfully'));
		return;
	}
	phase.value = 'awaiting-confirmation';
}

watchEffect(checkPreviewSettled);

onMounted(generatePreviewCase);
onBeforeUnmount(() => {
	isMounted = false;
	store.stopPollingRun();
});

async function onConfirm() {
	// Guards against a double-click firing generation twice before Vue removes
	// the button: the phase flip is synchronous, so a second call sees
	// `awaiting-confirmation` has already left and returns immediately.
	if (phase.value !== 'awaiting-confirmation') return;
	emit('confirm');
	phase.value = 'generating-suite';
	try {
		const { projectId, agentId } = props.target;
		// Fetches a full batch of 10 up front — the examples panel's slider
		// only trims how many are displayed, no repeated generation calls as
		// the user drags it.
		const result = await store.generateDraftCases(projectId, agentId, { count: 10 });
		if (!isMounted) return;
		suiteCases.value = result.cases;
		generatedCaseCount.value = result.cases.length;
		suiteDatasetId.value = result.datasetId;
		phase.value = 'suite-ready';
	} catch (error) {
		failAndDismiss(error);
	}
}

/** Resolves the suite dataset's case source, once it has one. */
function resolveSuiteSource() {
	if (!suiteDatasetId.value) return null;
	const dataset = store
		.getDatasets(props.target.agentId)
		.find((d) => d.id === suiteDatasetId.value);
	return dataset && isDataTableDataset(dataset) ? toCaseSource(dataset) : null;
}

async function onAddExample(input: string) {
	const source = resolveSuiteSource();
	if (!source) return;
	const { projectId } = props.target;
	addingExample.value = true;
	try {
		const created = await store.createCase(projectId, source, { input, whatToCheck: '' });
		if (!isMounted || !created) return;
		// No `scenario` — it's an LLM-generated tag, not something a user's own
		// typed example has. The examples panel only labels rows with a non-empty one.
		suiteCases.value = [
			...suiteCases.value,
			{ input: created.input, whatToCheck: created.whatToCheck, scenario: '' },
		];
	} finally {
		if (isMounted) addingExample.value = false;
	}
}

/**
 * Trims the generated batch down to the slider's cap (the user's own examples,
 * appended after it, are always kept), then runs the agent over what remains.
 * From here the panel shows each case's live status instead of the editor.
 */
async function onCheckAgent(count: number) {
	if (suiteCaseRows.value) return;
	const source = resolveSuiteSource();
	if (!source || !suiteDatasetId.value) return;
	const { projectId, agentId } = props.target;

	startingSuiteRun.value = true;
	try {
		const cases = await store.fetchCases(projectId, source);
		if (!isMounted) return;

		const overflow = cases.slice(count, generatedCaseCount.value);
		await Promise.all(overflow.map((c) => store.deleteCase(projectId, source, c.rowId)));
		if (!isMounted) return;

		const overflowRowIds = new Set(overflow.map((c) => c.rowId));
		suiteCaseRows.value = cases.filter((c) => !overflowRowIds.has(c.rowId));

		const run = await store.startRun(projectId, agentId, suiteDatasetId.value);
		if (!isMounted) return;
		suiteRunId.value = run.id;
		await store.openRun(projectId, agentId, run.id);
		if (!isMounted) return;
		if (store.isRunInFlight(run.id)) {
			store.startPollingRun(projectId, agentId, run.id);
		}
	} finally {
		if (isMounted) startingSuiteRun.value = false;
	}
}

function onViewEvals() {
	emit('open-evals');
}

// Cases already in flight settle on their own — only the ones not yet started
// stop. Polling keeps running until every case's status reflects that.
async function onStopSuiteRun() {
	const { projectId, agentId } = props.target;
	if (!suiteDatasetId.value || !suiteRunId.value) return;
	stoppingSuiteRun.value = true;
	try {
		await store.cancelRun(projectId, agentId, suiteDatasetId.value, suiteRunId.value);
	} catch (error) {
		if (!isMounted) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.run.cancelError'));
	} finally {
		if (isMounted) stoppingSuiteRun.value = false;
	}
}

function onNeedsWork() {
	if (phase.value !== 'awaiting-confirmation') return;
	sampleInput.value = '';
	phase.value = 'awaiting-sample-input';
}

async function onSubmitSampleInput() {
	const value = sampleInput.value.trim();
	if (!value || phase.value !== 'awaiting-sample-input') return;
	useInitialCase.value = false;
	previewRunId.value = null;
	phase.value = 'generating-preview';
	await runGeneratedPreview(value);
}

function onDontCreateEvals() {
	emit('dismiss');
}
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-test-agent-preview-panel">
		<template v-if="phase === 'generating-preview'">
			<div :class="$style.loadingRow" data-test-id="instance-ai-test-agent-preview-generating">
				<N8nSpinner size="small" />
				<N8nText color="text-base">
					{{ i18n.baseText('instanceAi.testAgentPreview.generatingPreview') }}
				</N8nText>
			</div>
		</template>

		<template v-else-if="phase === 'awaiting-confirmation'">
			<N8nCard data-test-id="instance-ai-test-agent-preview-input" :class="$style.inputCard">
				<template #header>
					<N8nText step="md" color="text-dark" :class="$style.title">
						{{ i18n.baseText('instanceAi.testAgentPreview.title') }}
					</N8nText>
				</template>
				<N8nText color="text-dark" :class="$style.subtitle">{{
					i18n.baseText('instanceAi.testAgentPreview.subtitle')
				}}</N8nText>
			</N8nCard>
			<EvalInitialSample :preview-input="previewInput" :preview-output="previewOutput ?? ''" />

			<N8nText bold color="text-dark" :class="$style.confirmQuestion">
				{{ i18n.baseText('instanceAi.testAgentPreview.confirmQuestion') }}
			</N8nText>
			<div :class="$style.options">
				<N8nButton
					variant="outline"
					size="small"
					data-test-id="instance-ai-test-agent-preview-looks-good"
					@click="onConfirm"
				>
					{{ i18n.baseText('instanceAi.testAgentPreview.looksGood') }}
				</N8nButton>
				<N8nButton
					variant="outline"
					size="small"
					data-test-id="instance-ai-test-agent-preview-needs-work"
					@click="onNeedsWork"
				>
					{{ i18n.baseText('instanceAi.testAgentPreview.needsWork') }}
				</N8nButton>
			</div>
		</template>

		<template v-else-if="phase === 'awaiting-sample-input'">
			<CapabilityChip
				:text="i18n.baseText('instanceAi.testAgentPreview.needsWork')"
				status="fail"
			/>
			<EvalInitialSample :preview-input="previewInput" :preview-output="previewOutput ?? ''" />
			<N8nText bold>{{ i18n.baseText('instanceAi.testAgentPreview.inputCorrectionHint') }}</N8nText>
			<N8nInput
				v-model="sampleInput"
				:autosize="{ minRows: 1, maxRows: 6 }"
				:placeholder="i18n.baseText('instanceAi.testAgentPreview.inputCorrectionPlaceholder')"
				data-test-id="instance-ai-test-agent-preview-sample-input"
				@keydown.meta.enter="onSubmitSampleInput"
				@keydown.enter="onSubmitSampleInput"
				@keydown.ctrl.enter="onSubmitSampleInput"
			>
				<template #prefix>
					<N8nIcon icon="sparkle" size="xsmall" color="primary" />
				</template>
			</N8nInput>
			<div :class="$style.options">
				<N8nButton
					variant="solid"
					size="small"
					:disabled="!sampleInput.trim()"
					data-test-id="instance-ai-test-agent-preview-submit-sample"
					@click="onSubmitSampleInput"
				>
					{{ i18n.baseText('instanceAi.testAgentPreview.saveCorrection') }}
				</N8nButton>
				<N8nButton
					variant="outline"
					size="small"
					data-test-id="instance-ai-test-agent-preview-dont-create-evals"
					@click="onDontCreateEvals"
				>
					{{ i18n.baseText('instanceAi.testAgentPreview.skip') }}
				</N8nButton>
			</div>
		</template>

		<template v-else-if="phase === 'generating-suite'">
			<div
				:class="$style.loadingRow"
				data-test-id="instance-ai-test-agent-preview-generating-suite"
			>
				<N8nSpinner size="small" />
				<N8nText color="text-base">
					{{ i18n.baseText('instanceAi.testAgentPreview.generatingSuite') }}
				</N8nText>
			</div>
		</template>

		<template v-else-if="phase === 'suite-ready'">
			<InstanceAiTestAgentExamplesPanel
				:preview-input="previewInput"
				:preview-output="previewOutput ?? ''"
				:preview-scenario="previewScenario"
				:examples="suiteCases"
				:adding-example="addingExample"
				:case-runs="suiteCaseRuns"
				:starting-run="startingSuiteRun"
				:stopping-run="stoppingSuiteRun"
				@add-example="onAddExample"
				@check-agent="onCheckAgent"
				@stop-run="onStopSuiteRun"
				@view-evals="onViewEvals"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	margin: var(--spacing--2xs) 0;
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.title {
	font-weight: bold;
	margin-bottom: var(--spacing--4xs);
}

.subtitle {
	color: var(--text-color--subtler);
	margin-bottom: var(--spacing--4xs);
}

.loadingRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.confirmQuestion {
	font-weight: bold;
}

// The input is a quoted pill rather than a response card — flatter than
// `N8nCard`'s default so it reads as "what was asked", not "an answer".
.inputCard {
	border: none;
	padding: 0;
}

.options {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
