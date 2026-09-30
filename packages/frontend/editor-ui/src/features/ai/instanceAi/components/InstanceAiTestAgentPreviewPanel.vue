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
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nInput, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import { readAgentAnswer, readCaseRequest } from '@/features/agents/utils/agent-eval-review';
import { useRelativeTimestamp } from '@/features/agents/utils/relative-time';
import { isDataTableDataset, toCaseSource } from '@/features/agents/utils/agentEvalCases.utils';
import AgentAnswerCard from '@/features/agents/components/AgentAnswerCard.vue';

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
const formatRelative = useRelativeTimestamp();

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
const sampleInput = ref('');
// Cleared once the user submits their own sample, so the display switches
// over to that new run instead of sticking with the builder's original test.
const useInitialCase = ref(Boolean(props.initialCase));

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
const previewAnsweredAt = computed(() => {
	if (useInitialCase.value) return null;
	const result = previewResult.value;
	const timestamp = result?.completedAt ?? result?.runAt ?? result?.createdAt;
	return timestamp ? formatRelative(timestamp) : null;
});

// The previewed case already has a real answer from its own run; the rest of
// the suite is generated as fresh drafts and isn't run here, so they show
// only their question until the user runs them from the Evals tab.
const suiteDisplayCases = computed(() => [
	{ input: previewInput.value, output: previewOutput.value, answeredAt: previewAnsweredAt.value },
	...suiteCases.value.map((draftCase) => ({
		input: draftCase.input,
		output: null as string | null,
		answeredAt: null as string | null,
	})),
]);

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

/**
 * Intentionally a no-op today. Wiring this to `store.startRun(projectId,
 * agentId, datasetId)` is the one change needed to auto-run the generated
 * suite once product wants that behavior.
 */
function maybeAutoRunGeneratedCases(_projectId: string, _agentId: string, _datasetId: string) {
	return;
}

async function onConfirm() {
	// Guards against a double-click firing generation twice before Vue removes
	// the button: the phase flip is synchronous, so a second call sees
	// `awaiting-confirmation` has already left and returns immediately.
	if (phase.value !== 'awaiting-confirmation') return;
	emit('confirm');
	phase.value = 'generating-suite';
	try {
		const { projectId, agentId } = props.target;
		// Explicit `{}` (rather than omitting the argument) so call-site assertions
		// in tests can match on a stable arity.
		const result = await store.generateDraftCases(projectId, agentId, {});
		if (!isMounted) return;
		suiteCases.value = result.cases;
		maybeAutoRunGeneratedCases(projectId, agentId, result.datasetId);
		phase.value = 'suite-ready';
	} catch (error) {
		failAndDismiss(error);
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

function onOpenEvals() {
	emit('open-evals');
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
					<N8nText step="xs" color="text-base" :class="$style.header">
						{{ i18n.baseText('instanceAi.testAgentPreview.eyebrow') }}
					</N8nText>
				</template>
				<N8nText color="text-dark" :class="$style.title">{{ previewInput }}</N8nText>
			</N8nCard>
			<AgentAnswerCard
				data-test-id="instance-ai-test-agent-preview-output"
				:label="i18n.baseText('instanceAi.testAgentPreview.agentLabel')"
				:answered-at="previewAnsweredAt"
				:source="previewOutput ?? ''"
			/>
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
					variant="ghost"
					size="small"
					data-test-id="instance-ai-test-agent-preview-needs-work"
					@click="onNeedsWork"
				>
					{{ i18n.baseText('instanceAi.testAgentPreview.needsWork') }}
				</N8nButton>
			</div>
		</template>

		<template v-else-if="phase === 'awaiting-sample-input'">
			<N8nInput
				v-model="sampleInput"
				type="textarea"
				:autosize="{ minRows: 1, maxRows: 6 }"
				:placeholder="i18n.baseText('instanceAi.testAgentPreview.sampleInputPlaceholder')"
				data-test-id="instance-ai-test-agent-preview-sample-input"
				@keydown.meta.enter="onSubmitSampleInput"
				@keydown.ctrl.enter="onSubmitSampleInput"
			/>
			<div :class="$style.options">
				<N8nButton
					variant="solid"
					size="small"
					:disabled="!sampleInput.trim()"
					data-test-id="instance-ai-test-agent-preview-submit-sample"
					@click="onSubmitSampleInput"
				>
					{{ i18n.baseText('instanceAi.testAgentPreview.submit') }}
				</N8nButton>
				<N8nButton
					variant="outline"
					size="small"
					data-test-id="instance-ai-test-agent-preview-dont-create-evals"
					@click="onDontCreateEvals"
				>
					{{ i18n.baseText('instanceAi.testAgentPreview.dontCreateEvals') }}
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
			<N8nText color="text-dark" data-test-id="instance-ai-test-agent-preview-suite-ready">
				{{
					i18n.baseText('agents.builder.agentEvals.generated', {
						adjustToNumber: suiteCases.length,
						interpolate: { count: String(suiteCases.length) },
					})
				}}
			</N8nText>
			<div :class="$style.caseList">
				<N8nCard
					v-for="(displayCase, index) in suiteDisplayCases"
					:key="index"
					data-test-id="instance-ai-test-agent-preview-case"
				>
					<template #header>
						<N8nText step="xs" color="text-base">
							{{ i18n.baseText('instanceAi.testAgentPreview.eyebrow') }}
						</N8nText>
					</template>
					<N8nText color="text-dark">{{ displayCase.input }}</N8nText>
					<AgentAnswerCard
						v-if="displayCase.output"
						:label="i18n.baseText('instanceAi.testAgentPreview.agentLabel')"
						:answered-at="displayCase.answeredAt"
						:source="displayCase.output"
					/>
				</N8nCard>
			</div>
			<N8nButton
				variant="outline"
				size="small"
				data-test-id="instance-ai-test-agent-preview-open-evals"
				@click="onOpenEvals"
			>
				{{ i18n.baseText('instanceAi.testAgentPreview.viewInEvals') }}
			</N8nButton>
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

.header {
	color: var(--text-color--subtler);
}

.title {
	margin-top: var(--spacing--4xs);
	font-size: var(--font-size--md);
}

.loadingRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.confirmQuestion {
	font-size: var(--font-size--lg);
	font-weight: bold;
}

// The input is a quoted pill rather than a response card — flatter than
// `N8nCard`'s default so it reads as "what was asked", not "an answer".
.inputCard {
	border: none;
	padding: 0;
}

.caseList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
}

.options {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
