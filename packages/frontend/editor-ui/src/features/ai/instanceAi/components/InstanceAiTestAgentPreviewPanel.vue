<script setup lang="ts">
/**
 * Post-setup suggestion to test the agent that was just built — the preview
 * variant. Instead of a generic "want to test this?" offer, it runs one real
 * case and reports whether that first check passed, with the example message
 * and what the judge found. The case comes from the builder's own test run
 * only when that run already has a rule and a verdict (`initialCase`);
 * otherwise the panel drafts, runs and judges one case of its own. Behind the
 * `INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT` flag, alongside the original
 * `InstanceAiTestAgentPanel`.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AgentEvalDraftCase, AgentEvalVerdict } from '@n8n/api-types';
import { N8nButton, N8nInput, N8nSpinner, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import type { AgentEvalCase } from '@/features/agents/agentEvals.types';
import {
	readAgentAnswer,
	readErrorMessage,
	readVerdictReasoning,
	toAvatarKind,
} from '@/features/agents/utils/agent-eval-review';
import { toDisplayToolCalls } from '@/features/agents/utils/agent-eval-tool-calls';
import { resolveCaseColumns } from '@/features/agents/utils/agentEvalCases.utils';
import AgentAvatar from '@/features/agents/components/AgentAvatar.vue';
import EvalInitialSample from '@/features/agents/components/EvalInitialSample.vue';
import InstanceAiTestAgentExamplesPanel, {
	type SuiteCaseRun,
} from './InstanceAiTestAgentExamplesPanel.vue';
import CapabilityChip from '@/features/agents/components/CapabilityChip.vue';

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
	/** The eval view should open, on the given result when there is one. */
	'open-evals': [resultId: string | null];
	'try-agent': [];
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
// The builder's own test run, when it is a complete first check. Read once: the
// card must not change under the user if a newer builder run lands later.
const reusedCase =
	props.initialCase?.whatToCheck && props.initialCase.verdict
		? {
				message: props.initialCase.message,
				response: props.initialCase.response,
				whatToCheck: props.initialCase.whatToCheck,
				verdict: props.initialCase.verdict,
			}
		: null;
// Skips straight to the result when the builder already ran a judged test —
// there is nothing to generate or wait on.
const phase = ref<Phase>(reusedCase ? 'awaiting-confirmation' : 'generating-preview');
// The drafted test message and the agent's real answer to it — set directly
// from `previewRun`'s response, which already ran the agent and returned the
// final text. No run id, no polling: unlike the suite below, this never
// touches a Data Table, dataset, or eval-run row at all.
const previewRequest = ref<string | null>(null);
const previewAnswer = ref<string | null>(null);
// Generated with `save: false` — a preview, not yet persisted. Nothing backs
// these rows until "Check your agent" commits them, so dismissing or
// refreshing mid-preview leaves no orphaned dataset behind.
const suiteCases = ref<AgentEvalDraftCase[]>([]);
// The user's own additions, kept the same way — in memory only, appended to
// the committed dataset alongside the slider's picked generated cases.
const suiteOwnExamples = ref<string[]>([]);
const suiteDatasetId = ref<string | null>(null);
// Null until "Check your agent" has trimmed the dataset to its cap — set, it
// replaces the slider/editor view with each case's live run status.
const suiteCaseRows = ref<AgentEvalCase[] | null>(null);
// Each committed row's scenario tag ("Vague", "Custom", …) — the Data Table
// only has `input`/`criteria` columns, so this is the only place that
// information survives once a case is persisted. Keyed by row id rather than
// input text so a "Save check" revision (which rewrites the row's input)
// doesn't orphan its own label.
const suiteCaseLabels = ref<Record<number, string>>({});
const suiteRunId = ref<string | null>(null);
const startingSuiteRun = ref(false);
// The cases are committed but no run could be started or followed — shown as a
// retry, since the rows would otherwise sit "waiting" for a run that isn't there.
const suiteRunFailed = ref(false);
const stoppingSuiteRun = ref(false);
const sampleInput = ref('');
// Cleared once the user submits their own sample, so the display switches
// over to that new run instead of sticking with the builder's original test.
const useInitialCase = ref(Boolean(reusedCase));
// The generated preview case's scenario tag. Null when reusing the builder's
// own test result (`initialCase`), which was never scenario-generated.
const previewScenario = ref<string | null>(null);
// The rule the preview case was checked against, and the judge's call on it.
const previewWhatToCheck = ref(reusedCase?.whatToCheck ?? '');
const previewVerdict = ref<AgentEvalVerdict | null>(reusedCase?.verdict ?? null);
// Whether the full example conversation is shown under "What we found".
const conversationExpanded = ref(false);

const previewInput = computed(() =>
	useInitialCase.value ? (reusedCase?.message ?? '') : (previewRequest.value ?? ''),
);
const previewOutput = computed(() =>
	useInitialCase.value ? (reusedCase?.response ?? '') : (previewAnswer.value ?? ''),
);

// Nothing failed when the judge passed the answer, or when the case had no rule to
// grade it against (`skipped`) — the card still shows, as a pass. A judge error is
// different: the answer was never graded, so it must not read as "passed".
const firstCheckPassed = computed(
	() =>
		previewVerdict.value?.status === 'skipped' ||
		(previewVerdict.value?.status === 'completed' && previewVerdict.value.outcome === 'pass'),
);
// A judge that ran and failed the answer is a real "needs work". Anything else
// means the answer was never graded, so the user can still go on to harder cases.
const firstCheckFailed = computed(
	() => previewVerdict.value?.status === 'completed' && previewVerdict.value.outcome === 'fail',
);
const findings = computed(() => {
	const verdict = previewVerdict.value;
	if (verdict?.status === 'completed' && verdict.reasoning) return verdict.reasoning;
	if (verdict?.status === 'skipped')
		return i18n.baseText('instanceAi.testAgentPreview.noRuleFindings');
	return i18n.baseText('instanceAi.testAgentPreview.noFindings');
});

// Each row's live state: "waiting" until its case has a settled result, then
// the outcome the result recorded. Kept as one derived list rather than
// mutated in place, so a case update never has to be reconciled by hand.
const suiteCaseRuns = computed<SuiteCaseRun[] | null>(() => {
	const rows = suiteCaseRows.value;
	if (!rows) return null;
	const results = suiteRunId.value ? store.getReview(suiteRunId.value).results : [];
	return rows.map((row) => {
		const label = suiteCaseLabels.value[row.rowId] ?? '';
		const result = results.find((r) => r.sourceRowId === String(row.rowId));
		if (!result || result.status === 'new' || result.status === 'running') {
			// A freshly seeded case has no output yet, but a single-case rerun's
			// result is marked `running` over its own still-successful prior
			// output — carried through rather than nulled, so the row keeps
			// showing its last answer while "Run check" repeats it.
			return {
				rowId: row.rowId,
				resultId: result?.id ?? null,
				input: row.input,
				label,
				status: 'waiting',
				output: result ? readAgentAnswer(result.output) : null,
				toolCalls: result ? toDisplayToolCalls(result.toolCalls) : [],
				whatToCheck: row.whatToCheck || null,
				errorMessage: null,
			};
		}
		return {
			rowId: row.rowId,
			resultId: result.id,
			input: row.input,
			label,
			status: toAvatarKind(result.status, result.verdict),
			output: readAgentAnswer(result.output),
			toolCalls: toDisplayToolCalls(result.toolCalls),
			whatToCheck: row.whatToCheck || null,
			// Execution failures and a graded verdict never both exist for the
			// same row (a case that errored is never judged), so either reader
			// filling this in is unambiguous.
			errorMessage: readErrorMessage(result.errorDetails) ?? readVerdictReasoning(result.verdict),
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

/** Feedback on a case that already ran, asking for a replacement that addresses it. */
type PreviewRevision = { suggestion: string; previousInput: string; previousOutput: string };

async function runGeneratedPreview(revision?: PreviewRevision) {
	try {
		const { projectId, agentId } = props.target;
		const result = await store.previewRun(projectId, agentId, revision);
		if (!isMounted) return;
		if (result.status !== 'completed') {
			failAndDismiss(new Error('Preview run did not complete successfully'));
			return;
		}
		previewScenario.value = result.scenario || null;
		previewWhatToCheck.value = result.whatToCheck;
		previewVerdict.value = result.verdict;
		previewRequest.value = result.input;
		previewAnswer.value = result.response;
		conversationExpanded.value = false;
		phase.value = 'awaiting-confirmation';
	} catch (error) {
		failAndDismiss(error);
	}
}

function generatePreviewCase() {
	if (reusedCase) return;
	return runGeneratedPreview();
}

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
		// The just-confirmed try is a known-good input/output pair — pass it along
		// so the batch is grounded in the style and scope the user already
		// approved, not just whatever the agent's config implies. Omitted rather
		// than sent blank: the schema requires non-empty strings when present.
		const example =
			previewInput.value && previewOutput.value
				? { exampleInput: previewInput.value, exampleOutput: previewOutput.value }
				: {};
		// Fetches a full batch of 10 up front — the examples panel's slider
		// only trims how many are displayed, no repeated generation calls as
		// the user drags it. `save: false`: nothing is persisted until "Check
		// your agent" commits the picked subset.
		const result = await store.generateDraftCases(projectId, agentId, {
			count: 10,
			save: false,
			...example,
		});
		if (!isMounted) return;
		suiteCases.value = result.cases;
		phase.value = 'suite-ready';
	} catch (error) {
		failAndDismiss(error);
	}
}

/** Kept in memory only — nothing is persisted until "Check your agent" commits. */
function onAddExample(input: string) {
	suiteOwnExamples.value = [...suiteOwnExamples.value, input];
}

/**
 * Commits the preview: creates a real (empty) dataset, inserts the slider's
 * selected generated cases plus every self-written one as rows, then runs the
 * agent over them. From here the panel shows each case's live status instead
 * of the editor. Nothing from the preview is persisted before this point.
 */
async function onCheckAgent(count: number) {
	if (suiteCaseRows.value) return;
	const { projectId, agentId } = props.target;

	startingSuiteRun.value = true;
	// Once `startRun` has been sent, a failure is ambiguous: the request may
	// have reached the server and seeded a real run before the response itself
	// failed or timed out. Rolling back past this point would delete that run
	// and its results along with the dataset — so rollback is only for
	// failures strictly before submission, where nothing has been seeded yet.
	let runSubmitted = false;
	// The panel can go away while a request is pending. A continuation that finds it
	// gone before the run was submitted has nobody left to follow the draft, so it
	// discards what it created. A submitted run is left alone. Each check is
	// synchronous: an `await` between it and the next step would let an unmount in
	// between go unseen.
	const discardDraft = async (datasetId: string) => {
		await store.deleteDraftDataset(projectId, agentId, datasetId).catch(() => null);
	};
	try {
		const created = await store.createDraftDataset(projectId, agentId);
		if (!isMounted) {
			await discardDraft(created.datasetId);
			return;
		}
		suiteDatasetId.value = created.datasetId;
		// Resolved straight from the create response — not a `getDatasets` refetch,
		// which could itself fail transiently after the dataset already exists and
		// send a retry into creating a second, duplicate empty dataset.
		const columns = resolveCaseColumns(created.columnMapping);
		if (!columns) throw new Error('The draft dataset has no writable case columns');
		const source = { datasetId: created.datasetId, dataTableId: created.dataTableId, columns };

		const selectedCases = suiteCases.value.slice(0, count);
		// The confirmed try is the first saved check, ahead of the picked extras.
		const confirmedTry = { input: previewInput.value, whatToCheck: previewWhatToCheck.value };
		const toCreate = [
			...selectedCases.map((c) => ({ input: c.input, whatToCheck: c.whatToCheck })),
			...suiteOwnExamples.value.map((input) => ({ input, whatToCheck: '' })),
		];
		// Created on its own first so it gets the lowest row id; the rest don't
		// depend on each other.
		await store.createCase(projectId, source, confirmedTry);
		await Promise.all(toCreate.map((value) => store.createCase(projectId, source, value)));
		if (!isMounted) {
			await discardDraft(created.datasetId);
			return;
		}

		const cases = await store.fetchCases(projectId, source);
		if (!isMounted) {
			await discardDraft(created.datasetId);
			return;
		}
		// The Data Table has no column for the scenario tag — carry it over here,
		// matched by the input text each row was created from, before `cases`
		// (keyed by row id, stable across later revisions) replaces that lookup.
		const customLabel = i18n.baseText('instanceAi.testAgentPreview.customExampleLabel');
		const labelByInput = new Map<string, string>(selectedCases.map((c) => [c.input, c.scenario]));
		for (const input of suiteOwnExamples.value) labelByInput.set(input, customLabel);
		labelByInput.set(
			confirmedTry.input,
			previewScenario.value ?? i18n.baseText('instanceAi.testAgentPreview.yourTry'),
		);
		suiteCaseLabels.value = Object.fromEntries(
			cases.map((c) => [c.rowId, labelByInput.get(c.input) ?? '']),
		);
		suiteCaseRows.value = cases;

		runSubmitted = true;
		const run = await store.startRun(projectId, agentId, created.datasetId);
		if (!isMounted) return;
		suiteRunId.value = run.id;
		await followSuiteRun();
	} catch (error) {
		if (suiteDatasetId.value && !runSubmitted) {
			// A partial insert leaves a persisted-but-incomplete dataset behind —
			// delete it rather than let a retry pile up another one alongside it.
			// Runs regardless of `isMounted`: the dataset already exists
			// server-side either way.
			await store.deleteDraftDataset(projectId, agentId, suiteDatasetId.value).catch(() => null);
			suiteDatasetId.value = null;
		}
		if (!isMounted) return;
		// A recovered run is already being followed — nothing to tell the user.
		if (runSubmitted && (await recoverSuiteRun())) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.run.startError'));
	} finally {
		if (isMounted) startingSuiteRun.value = false;
	}
}

/** Loads the committed run's results and follows it until every case settles. */
async function followSuiteRun() {
	const { projectId, agentId } = props.target;
	const runId = suiteRunId.value;
	if (!runId) return;
	await store.openRun(projectId, agentId, runId);
	if (!isMounted) return;
	if (store.isRunInFlight(runId)) {
		store.startPollingRun(projectId, agentId, runId);
	}
}

/**
 * Picks the committed dataset's run back up after the start or the first read
 * failed. A start whose response was lost may still have seeded a real run, so
 * it looks for that run before concluding there is none — starting another
 * would run every case twice. With none found, it flags the failure so the
 * user can retry instead of watching rows wait for a run that does not exist.
 */
async function recoverSuiteRun(): Promise<boolean> {
	const { projectId, agentId } = props.target;
	if (!suiteDatasetId.value) return false;
	try {
		if (!suiteRunId.value) {
			suiteRunId.value = await store.resolveLatestRunId(projectId, agentId, suiteDatasetId.value);
		}
		if (suiteRunId.value) {
			suiteRunFailed.value = false;
			await followSuiteRun();
			return true;
		}
	} catch {
		// Reconciling failed too; fall through to the retry state.
	}
	if (isMounted) suiteRunFailed.value = true;
	return false;
}

async function onRetrySuiteRun() {
	const datasetId = suiteDatasetId.value;
	if (!datasetId || startingSuiteRun.value) return;
	const { projectId, agentId } = props.target;
	startingSuiteRun.value = true;
	try {
		if (!suiteRunId.value) {
			// A retry that raced a slow earlier start must not run the cases twice.
			suiteRunId.value = await store.resolveLatestRunId(projectId, agentId, datasetId);
		}
		if (!suiteRunId.value) {
			const run = await store.startRun(projectId, agentId, datasetId);
			if (!isMounted) return;
			suiteRunId.value = run.id;
		}
		suiteRunFailed.value = false;
		await followSuiteRun();
	} catch (error) {
		if (!isMounted) return;
		suiteRunFailed.value = true;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.run.startError'));
	} finally {
		if (isMounted) startingSuiteRun.value = false;
	}
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
	const suggestion = sampleInput.value.trim();
	if (!suggestion || phase.value !== 'awaiting-sample-input') return;
	// Read before resetting state below — once cleared these computeds have
	// nothing left to read the prior try's input/output from.
	const previousInput = previewInput.value;
	const previousOutput = previewOutput.value ?? '';
	useInitialCase.value = false;
	previewRequest.value = null;
	previewAnswer.value = null;
	previewVerdict.value = null;
	phase.value = 'generating-preview';
	await runGeneratedPreview({ suggestion, previousInput, previousOutput });
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
			<div
				:class="$style.firstCheck"
				:data-passed="firstCheckPassed"
				data-test-id="instance-ai-test-agent-preview-first-check"
			>
				<div :class="$style.firstCheckHeader">
					<AgentAvatar :kind="firstCheckPassed ? 'pass' : 'work'" size="sm" />
					<N8nText
						bold
						size="medium"
						color="text-dark"
						data-test-id="instance-ai-test-agent-preview-first-check-title"
					>
						{{
							i18n.baseText(
								firstCheckPassed
									? 'instanceAi.testAgentPreview.firstCheckPassed'
									: 'instanceAi.testAgentPreview.firstCheckNeedsWork',
							)
						}}
					</N8nText>
				</div>

				<div :class="$style.section">
					<N8nText bold color="text-dark" size="small">
						{{ i18n.baseText('instanceAi.testAgentPreview.exampleMessage') }}
					</N8nText>
					<N8nText
						color="text-dark"
						data-test-id="instance-ai-test-agent-preview-example"
						size="small"
					>
						“{{ previewInput }}”
					</N8nText>
				</div>

				<div :class="$style.section">
					<N8nText bold color="text-dark" size="small">
						{{ i18n.baseText('instanceAi.testAgentPreview.whatWeFound') }}
					</N8nText>
					<div :class="$style.findings">
						<N8nText
							color="text-dark"
							size="small"
							:class="$style.findingsText"
							data-test-id="instance-ai-test-agent-preview-findings"
						>
							{{ findings }}
						</N8nText>
						<N8nButton
							variant="outline"
							size="small"
							icon-only
							:aria-expanded="conversationExpanded"
							:aria-label="
								i18n.baseText(
									conversationExpanded
										? 'instanceAi.testAgentPreview.hideConversation'
										: 'instanceAi.testAgentPreview.showConversation',
								)
							"
							data-test-id="instance-ai-test-agent-preview-toggle-conversation"
							@click="conversationExpanded = !conversationExpanded"
						>
							<template #icon>
								<N8nIcon icon="message-square" size="small" />
							</template>
						</N8nButton>
					</div>
					<EvalInitialSample
						v-if="conversationExpanded"
						:preview-input="previewInput"
						:preview-output="previewOutput ?? ''"
						hide-banner
					/>
				</div>

				<N8nText color="text-base" size="small">
					{{
						i18n.baseText(
							firstCheckPassed
								? 'instanceAi.testAgentPreview.firstCheckPassedHint'
								: 'instanceAi.testAgentPreview.firstCheckNeedsWorkHint',
						)
					}}
				</N8nText>

				<div :class="$style.options">
					<template v-if="firstCheckPassed">
						<N8nButton
							variant="solid"
							size="small"
							data-test-id="instance-ai-test-agent-preview-check-harder"
							@click="onConfirm"
						>
							{{ i18n.baseText('instanceAi.testAgentPreview.checkHarderCases') }}
						</N8nButton>
					</template>
					<template v-else>
						<N8nButton
							variant="solid"
							size="small"
							data-test-id="instance-ai-test-agent-preview-needs-work"
							@click="onNeedsWork"
						>
							{{ i18n.baseText('instanceAi.testAgentPreview.fixThisCheck') }}
						</N8nButton>
						<!-- Only when the answer was never graded (judge error, no rule): a real
						     fail is the user's cue to fix the check first. -->
						<N8nButton
							v-if="!firstCheckFailed"
							variant="outline"
							size="small"
							data-test-id="instance-ai-test-agent-preview-check-harder"
							@click="onConfirm"
						>
							{{ i18n.baseText('instanceAi.testAgentPreview.checkHarderCasesAnyway') }}
						</N8nButton>
					</template>
					<N8nButton
						variant="ghost"
						size="small"
						data-test-id="instance-ai-test-agent-preview-later"
						@click="onDontCreateEvals"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.later') }}
					</N8nButton>
				</div>
			</div>
		</template>

		<template v-else-if="phase === 'awaiting-sample-input'">
			<CapabilityChip
				:text="i18n.baseText('instanceAi.testAgentPreview.needsWork')"
				status="fail"
			/>
			<EvalInitialSample
				:preview-input="previewInput"
				:preview-output="previewOutput ?? ''"
				hide-banner
			/>
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
				:project-id="target.projectId"
				:examples="suiteCases"
				:case-runs="suiteCaseRuns"
				:starting-run="startingSuiteRun"
				:stopping-run="stoppingSuiteRun"
				:run-failed="suiteRunFailed"
				@add-example="onAddExample"
				@check-agent="onCheckAgent"
				@stop-run="onStopSuiteRun"
				@retry-run="onRetrySuiteRun"
				@try-agent="emit('try-agent')"
				@open-case="emit('open-evals', $event)"
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

.loadingRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.firstCheck {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--sm);
	width: 100%;
}

.firstCheckHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.findings {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.findingsText {
	flex: 1;
	min-width: 0;
}

.options {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
