<script setup lang="ts">
/**
 * Post-setup first check of the agent that was just built, as one step line in
 * the Assistant's thread. It runs one real case and reports the result in
 * plain words. The line opens to the check's thread (`AgentThreadPreview`),
 * which shows the run step by step. Then "Practice more" saves the check and
 * opens the Checks tab, and "Try it for real" opens the chat preview.
 *
 * The case comes from the builder's own test run only when that run already
 * has a rule and a verdict (`initialCase`); otherwise the panel drafts, runs
 * and judges one case of its own. Behind the `101_agent_evals` flag.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AgentEvalVerdict } from '@n8n/api-types';
import {
	N8nAnimatedCollapsibleContent as AnimatedCollapsibleContent,
	N8nAiActivityStepButton as StepButton,
	N8nAiActivityStepChevron as StepChevron,
	N8nButton,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';

import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import { useApplyAgentEvalSuggestions } from '@/features/agents/composables/useApplyAgentEvalSuggestions';
import {
	readVerdictReasoning,
	readVerdictSuggestion,
} from '@/features/agents/utils/agent-eval-review';
import { resolveCaseColumns } from '@/features/agents/utils/agentEvalCases.utils';
import AgentAvatar, { type AgentAvatarKind } from '@/features/agents/components/AgentAvatar.vue';
import AgentThreadPreview, {
	type AgentThreadPreviewState,
} from '@/features/agents/components/AgentThreadPreview.vue';

const props = defineProps<{
	target: { agentId: string; projectId: string };
	/**
	 * A real input/output pair from the agent builder's own "Testing agent"
	 * step, when one exists. Reused only when it also carries the rule it was
	 * checked against and the judge's verdict: without both there is no first
	 * check to report, so the panel drafts, runs and judges a case of its own.
	 */
	initialCase?: {
		message: string;
		response: string;
		whatToCheck?: string | null;
		verdict?: AgentEvalVerdict | null;
	} | null;
}>();

const emit = defineEmits<{
	confirm: [];
	dismiss: [];
	/** The Checks tab should open, with Add a check open. */
	'practice-more': [];
	'try-agent': [];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useAgentEvalsStore();
const { applyingPreview, applyPreviewSuggestion } = useApplyAgentEvalSuggestions(
	() => props.target,
);

// The builder's own test run, when it is a complete first check. Read once: the
// line must not change under the user if a newer builder run lands later.
const reusedCase =
	props.initialCase?.whatToCheck && props.initialCase.verdict
		? {
				message: props.initialCase.message,
				response: props.initialCase.response,
				whatToCheck: props.initialCase.whatToCheck,
				verdict: props.initialCase.verdict,
			}
		: null;

const input = ref(reusedCase?.message ?? '');
const output = ref(reusedCase?.response ?? '');
const whatToCheck = ref(reusedCase?.whatToCheck ?? '');
const verdict = ref<AgentEvalVerdict | null>(reusedCase?.verdict ?? null);
// The thread's own step. The preview run answers in one response, so the steps
// after "preparing" are shown in turn once the response is in.
const threadState = ref<AgentThreadPreviewState>(reusedCase ? 'pass' : 'preparing');
const isOpen = ref(false);
// True after "Apply suggestion" ran the same message again.
const applied = ref(false);
const suggestionDismissed = ref(false);
const savingFirstCheck = ref(false);

// Nothing failed when the judge passed the answer, or when the case had no rule to
// grade it against (`skipped`). A judge error is different: the answer was never
// graded, so it must not read as "passed".
const passed = computed(
	() =>
		verdict.value?.status === 'skipped' ||
		(verdict.value?.status === 'completed' && verdict.value.outcome === 'pass'),
);
const isRunning = computed(
	() =>
		threadState.value === 'preparing' ||
		threadState.value === 'awaiting-reply' ||
		threadState.value === 'analyzing',
);
const suggestion = computed(() => readVerdictSuggestion(verdict.value));
const showSuggestion = computed(
	() =>
		!isRunning.value && !passed.value && suggestion.value !== null && !suggestionDismissed.value,
);
// The ways on wait while a suggestion is on screen.
const showNext = computed(() => !isRunning.value && !showSuggestion.value);

const stepLabel = computed(() => {
	if (applyingPreview.value) return i18n.baseText('instanceAi.firstCheck.applying');
	if (isRunning.value) return i18n.baseText('instanceAi.firstCheck.running');
	if (passed.value) {
		return i18n.baseText(
			applied.value ? 'instanceAi.firstCheck.passedAfterChange' : 'instanceAi.firstCheck.passed',
		);
	}
	return i18n.baseText(
		applied.value ? 'instanceAi.firstCheck.stillNeedsWork' : 'instanceAi.firstCheck.needsWork',
	);
});
const stepAvatar = computed<AgentAvatarKind>(() => {
	if (isRunning.value) return 'waiting';
	return passed.value ? 'pass' : 'work';
});

// Not reactive by design: it only guards async continuations against acting
// after the panel is gone.
let isMounted = true;
const pause = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

/** Shows the run's steps in turn, then the verdict. */
async function playRun(next: { input: string; output: string; verdict: AgentEvalVerdict | null }) {
	input.value = next.input;
	threadState.value = 'awaiting-reply';
	await pause(1400);
	if (!isMounted) return;
	output.value = next.output;
	threadState.value = 'analyzing';
	await pause(1600);
	if (!isMounted) return;
	verdict.value = next.verdict;
	threadState.value = passed.value ? 'pass' : 'needs-work';
	// A check that could be better opens, so its suggestion shows.
	if (!passed.value) isOpen.value = true;
}

async function runFirstCheck() {
	if (reusedCase) {
		if (!passed.value) {
			threadState.value = 'needs-work';
			isOpen.value = true;
		}
		return;
	}
	try {
		const { projectId, agentId } = props.target;
		const result = await store.previewRun(projectId, agentId);
		if (!isMounted) return;
		if (result.status !== 'completed') throw new Error('Preview run did not complete successfully');
		whatToCheck.value = result.whatToCheck;
		await playRun({ input: result.input, output: result.response, verdict: result.verdict });
	} catch (error) {
		if (!isMounted) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.generateError'));
		emit('dismiss');
	}
}

onMounted(runFirstCheck);
onBeforeUnmount(() => {
	isMounted = false;
});

// Rewrites the agent's instructions with the suggestion, then runs the same
// message again. The thread follows the rerun.
async function onApplySuggestion() {
	const proposal = suggestion.value;
	if (!proposal || applyingPreview.value) return;
	threadState.value = 'awaiting-reply';
	const result = await applyPreviewSuggestion({
		input: input.value,
		whatToCheck: whatToCheck.value,
		suggestion: proposal,
	});
	if (!isMounted) return;
	if (result?.preview.status !== 'completed') {
		// The instructions may already be saved, so the old suggestion must not be offered again.
		suggestionDismissed.value = Boolean(result);
		threadState.value = 'needs-work';
		if (result) {
			toast.showError(
				new Error('Preview run did not complete successfully'),
				i18n.baseText('agents.builder.agentEvals.suggestion.rerunError'),
			);
		}
		return;
	}
	applied.value = true;
	suggestionDismissed.value = true;
	output.value = result.preview.response;
	threadState.value = 'analyzing';
	await pause(1200);
	if (!isMounted) return;
	verdict.value = result.preview.verdict;
	threadState.value = passed.value ? 'pass' : 'needs-work';
}

/**
 * Saves the first check as the agent's first saved check, runs it once so the
 * Checks tab has its result, then opens the tab. An agent that already has
 * checks keeps them as they are.
 */
async function onPracticeMore() {
	if (savingFirstCheck.value) return;
	emit('confirm');
	const { projectId, agentId } = props.target;
	savingFirstCheck.value = true;
	let createdDatasetId: string | undefined;
	try {
		const existing = await store.fetchDatasets(projectId, agentId);
		if (existing.length === 0 && input.value) {
			const created = await store.createDraftDataset(projectId, agentId);
			createdDatasetId = created.datasetId;
			const columns = resolveCaseColumns(created.columnMapping);
			if (!columns) throw new Error('The draft dataset has no writable case columns');
			const source = { datasetId: created.datasetId, dataTableId: created.dataTableId, columns };
			await store.createCase(projectId, source, {
				input: input.value,
				whatToCheck: whatToCheck.value,
			});
			const datasetId = created.datasetId;
			createdDatasetId = undefined;
			await store.startRun(projectId, agentId, datasetId);
		}
		store.requestAddCheckOpen(agentId);
		emit('practice-more');
	} catch (error) {
		if (createdDatasetId) {
			await store.deleteDraftDataset(projectId, agentId, createdDatasetId).catch(() => null);
		}
		if (isMounted)
			toast.showError(error, i18n.baseText('agents.builder.agentEvals.run.startError'));
	} finally {
		if (isMounted) savingFirstCheck.value = false;
	}
}

function onTryForReal() {
	emit('confirm');
	emit('try-agent');
}

const reasoning = computed(() => readVerdictReasoning(verdict.value));
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-test-agent-preview-panel">
		<CollapsibleRoot v-slot="{ open }" v-model:open="isOpen">
			<CollapsibleTrigger as-child>
				<StepButton
					:loading="isRunning || applyingPreview"
					size="medium"
					data-test-id="instance-ai-test-agent-preview-first-check"
				>
					<template #prefix>
						<AgentAvatar :kind="stepAvatar" size="xs" :class="$style.stepAvatar" />
					</template>
					<span data-test-id="instance-ai-test-agent-preview-first-check-title">{{
						stepLabel
					}}</span>
					<template #icon>
						<StepChevron :open="open" />
					</template>
				</StepButton>
			</CollapsibleTrigger>

			<N8nText tag="p" size="medium" color="text-base" :class="$style.description">
				{{ i18n.baseText('instanceAi.firstCheck.description') }}
			</N8nText>

			<AnimatedCollapsibleContent :class="$style.rail">
				<div :class="$style.railInner">
					<AgentThreadPreview
						:state="threadState"
						:input="input"
						:output="output"
						:message="reasoning"
						:status-label="
							applyingPreview && threadState === 'awaiting-reply'
								? i18n.baseText('instanceAi.firstCheck.applyingStatus')
								: undefined
						"
						:project-id="target.projectId"
					/>
				</div>
			</AnimatedCollapsibleContent>
		</CollapsibleRoot>

		<div
			v-if="showSuggestion && suggestion"
			:class="[$style.rail, $style.suggestion]"
			data-test-id="instance-ai-test-agent-preview-suggestion"
		>
			<div :class="$style.railInner">
				<N8nText bold color="text-dark" size="medium">
					{{ i18n.baseText('agents.builder.agentEvals.suggestion.title') }}
				</N8nText>
				<N8nText color="text-base" size="medium" :class="$style.suggestionText">{{
					suggestion
				}}</N8nText>
				<div :class="$style.actions">
					<N8nButton
						variant="solid"
						size="small"
						:loading="applyingPreview"
						data-test-id="instance-ai-test-agent-preview-suggestion-apply"
						@click="onApplySuggestion"
					>
						{{ i18n.baseText('agents.builder.agentEvals.suggestion.apply') }}
					</N8nButton>
					<N8nButton
						variant="outline"
						size="small"
						:disabled="applyingPreview"
						data-test-id="instance-ai-test-agent-preview-suggestion-dismiss"
						@click="suggestionDismissed = true"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.actuallyFine') }}
					</N8nButton>
				</div>
			</div>
		</div>

		<div v-if="showNext" :class="$style.next">
			<N8nText v-if="applied && passed" tag="p" size="medium" color="text-dark">
				{{ i18n.baseText('instanceAi.firstCheck.betterNow') }}
			</N8nText>
			<N8nText tag="p" size="medium" color="text-dark" data-test-id="instance-ai-first-check-tease">
				{{ i18n.baseText('instanceAi.firstCheck.tease') }}
			</N8nText>
			<div :class="$style.actions">
				<N8nButton
					variant="outline"
					size="medium"
					:loading="savingFirstCheck"
					data-test-id="instance-ai-test-agent-preview-practice-more"
					@click="onPracticeMore"
				>
					{{ i18n.baseText('instanceAi.firstCheck.practiceMore') }}
				</N8nButton>
				<N8nButton
					variant="outline"
					size="medium"
					data-test-id="instance-ai-test-agent-preview-try-for-real"
					@click="onTryForReal"
				>
					{{ i18n.baseText('instanceAi.firstCheck.tryForReal') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--2xs);
	margin: var(--spacing--2xs) 0;
}

/* 16px, so the bot sits in the step line like the builder's step icons. */
.root .stepAvatar {
	--avatar-size: 16px;
	margin-right: var(--spacing--4xs);
}

/* Lined up with the step label: the 16px bot and its gap. */
.description {
	margin: var(--spacing--3xs) 0 0;
	padding-left: 22px;
}

/* The builder's rail (AgentSection's .content). */
.rail {
	margin-left: var(--spacing--xs);
}

.railInner {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) 0 var(--spacing--3xs) var(--spacing--2xs);
	border-left: var(--border);
}

.suggestion .railInner {
	padding-top: var(--spacing--xs);
}

.suggestionText {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.next {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);

	p {
		margin: 0;
	}
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
