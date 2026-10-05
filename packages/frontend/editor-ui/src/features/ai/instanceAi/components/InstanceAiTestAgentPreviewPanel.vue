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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AgentEvalDraftCase, AgentEvalResultStatus } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nInput, N8nSpinner, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import type { AgentEvalCase } from '@/features/agents/agentEvals.types';
import { readAgentAnswer } from '@/features/agents/utils/agent-eval-review';
import { toDisplayToolCalls } from '@/features/agents/utils/agent-eval-tool-calls';
import {
	isDataTableDataset,
	resolveCaseColumns,
	toCaseSource,
} from '@/features/agents/utils/agentEvalCases.utils';
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
const stoppingSuiteRun = ref(false);
const sampleInput = ref('');
// Cleared once the user submits their own sample, so the display switches
// over to that new run instead of sticking with the builder's original test.
const useInitialCase = ref(Boolean(props.initialCase));
// The generated preview case's scenario tag. Null when reusing the builder's
// own test result (`initialCase`), which was never scenario-generated.
const previewScenario = ref<string | null>(null);

const previewInput = computed(() =>
	useInitialCase.value ? (props.initialCase?.message ?? '') : (previewRequest.value ?? ''),
);
const previewOutput = computed(() =>
	useInitialCase.value ? (props.initialCase?.response ?? '') : (previewAnswer.value ?? ''),
);

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
			};
		}
		return {
			rowId: row.rowId,
			resultId: result.id,
			input: row.input,
			label,
			status: resultStatusToKind(result.status),
			output: readAgentAnswer(result.output),
			toolCalls: toDisplayToolCalls(result.toolCalls),
			whatToCheck: row.whatToCheck || null,
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
		previewRequest.value = result.input;
		previewAnswer.value = result.response;
		phase.value = 'awaiting-confirmation';
	} catch (error) {
		failAndDismiss(error);
	}
}

function generatePreviewCase() {
	if (props.initialCase) return;
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

/** Resolves the suite dataset's case source, once it has one. */
function resolveSuiteSource() {
	if (!suiteDatasetId.value) return null;
	const dataset = store
		.getDatasets(props.target.agentId)
		.find((d) => d.id === suiteDatasetId.value);
	return dataset && isDataTableDataset(dataset) ? toCaseSource(dataset) : null;
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
	try {
		const created = await store.createDraftDataset(projectId, agentId);
		suiteDatasetId.value = created.datasetId;
		// Resolved straight from the create response — not a `getDatasets` refetch,
		// which could itself fail transiently after the dataset already exists and
		// send a retry into creating a second, duplicate empty dataset.
		const columns = resolveCaseColumns(created.columnMapping);
		if (!columns) throw new Error('The draft dataset has no writable case columns');
		const source = { datasetId: created.datasetId, dataTableId: created.dataTableId, columns };

		const selectedCases = suiteCases.value.slice(0, count);
		const toCreate = [
			...selectedCases.map((c) => ({ input: c.input, whatToCheck: c.whatToCheck })),
			...suiteOwnExamples.value.map((input) => ({ input, whatToCheck: '' })),
		];
		await Promise.all(toCreate.map((value) => store.createCase(projectId, source, value)));
		if (!isMounted) return;

		const cases = await store.fetchCases(projectId, source);
		if (!isMounted) return;
		// The Data Table has no column for the scenario tag — carry it over here,
		// matched by the input text each row was created from, before `cases`
		// (keyed by row id, stable across later revisions) replaces that lookup.
		const customLabel = i18n.baseText('instanceAi.testAgentPreview.customExampleLabel');
		const labelByInput = new Map<string, string>(selectedCases.map((c) => [c.input, c.scenario]));
		for (const input of suiteOwnExamples.value) labelByInput.set(input, customLabel);
		suiteCaseLabels.value = Object.fromEntries(
			cases.map((c) => [c.rowId, labelByInput.get(c.input) ?? '']),
		);
		suiteCaseRows.value = cases;

		runSubmitted = true;
		const run = await store.startRun(projectId, agentId, created.datasetId);
		if (!isMounted) return;
		suiteRunId.value = run.id;
		await store.openRun(projectId, agentId, run.id);
		if (!isMounted) return;
		if (store.isRunInFlight(run.id)) {
			store.startPollingRun(projectId, agentId, run.id);
		}
	} catch (error) {
		if (suiteDatasetId.value && !runSubmitted) {
			// A partial insert leaves a persisted-but-incomplete dataset behind —
			// delete it rather than let a retry pile up another one alongside it.
			// Runs regardless of `isMounted`: the dataset already exists
			// server-side either way.
			await store.deleteDataset(projectId, agentId, suiteDatasetId.value).catch(() => null);
			suiteDatasetId.value = null;
		}
		if (!isMounted) return;
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

// "Save check" ends by rerunning the whole suite dataset — there is no run
// primitive scoped to one row's *revision*, so every row briefly goes back to
// "waiting", not just the one being revised.
const revisingRowId = ref<number | null>(null);

/** Starts a fresh run over the current suite dataset and begins following it. */
async function runSuiteDataset() {
	if (!suiteDatasetId.value) return;
	const { projectId, agentId } = props.target;
	const run = await store.startRun(projectId, agentId, suiteDatasetId.value);
	if (!isMounted) return;
	suiteRunId.value = run.id;
	await store.openRun(projectId, agentId, run.id);
	if (!isMounted) return;
	if (store.isRunInFlight(run.id)) {
		store.startPollingRun(projectId, agentId, run.id);
	}
}

// "Run check" on a case that doesn't need correction: reruns just that one
// result in place, never touching the rest of the suite. The store patches
// the result to `running` itself (and reverts it on failure), so `suiteCaseRuns`
// picks up the "waiting" status through the ordinary mapping — nothing here
// tracks which row is in flight.
async function onRerunCase(resultId: string) {
	const { projectId, agentId } = props.target;
	try {
		await store.rerunResult(projectId, agentId, resultId);
	} catch (error) {
		if (!isMounted) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunCaseError'));
	}
}

// Editing the rule writes the case row itself (so a later whole-suite rerun
// keeps using it too), then reruns just this one result — same action as
// "Run check", with the write folded in ahead of it.
async function onUpdateWhatToCheck({
	rowId,
	resultId,
	whatToCheck,
}: {
	rowId: number;
	resultId: string;
	whatToCheck: string;
}) {
	const source = resolveSuiteSource();
	const row = suiteCaseRows.value?.find((c) => c.rowId === rowId);
	if (!source || !row) return;
	const { projectId, agentId } = props.target;

	try {
		const updated = await store.updateCase(projectId, source, rowId, {
			input: row.input,
			whatToCheck,
		});
		if (!isMounted) return;
		if (!updated) {
			toast.showError(
				new Error('Failed to save the rule'),
				i18n.baseText('agents.builder.agentEvals.generateError'),
			);
			return;
		}
		suiteCaseRows.value =
			suiteCaseRows.value?.map((c) => (c.rowId === rowId ? { ...c, whatToCheck } : c)) ?? null;

		await store.rerunResult(projectId, agentId, resultId);
	} catch (error) {
		if (!isMounted) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunCaseError'));
	}
}

async function onReviseCase({ rowId, suggestion }: { rowId: number; suggestion: string }) {
	// One rerun covers every row, so a second revision while the first is still
	// in flight would race it for the same dataset and run — the singleton
	// poller would then settle on whichever one started last.
	if (revisingRowId.value !== null) return;
	const source = resolveSuiteSource();
	const row = suiteCaseRows.value?.find((c) => c.rowId === rowId);
	if (!source || !suiteDatasetId.value || !row) return;
	const { projectId, agentId } = props.target;
	const previousOutput = suiteCaseRuns.value?.find((r) => r.rowId === rowId)?.output ?? '';

	revisingRowId.value = rowId;
	try {
		const result = await store.generateDraftCases(projectId, agentId, {
			count: 1,
			suggestion,
			previousInput: row.input,
			previousOutput,
		});
		if (!isMounted) return;
		const revised = result.cases[0];
		if (!revised) return;

		const updated = await store.updateCase(projectId, source, rowId, {
			input: revised.input,
			whatToCheck: revised.whatToCheck,
		});
		if (!isMounted) return;
		// The dataset still has the old content — showing the replacement or
		// rerunning on top of it would be a lie about what was actually saved.
		if (!updated) {
			toast.showError(
				new Error('Failed to save the revised case'),
				i18n.baseText('agents.builder.agentEvals.generateError'),
			);
			return;
		}
		suiteCaseRows.value =
			suiteCaseRows.value?.map((c) =>
				c.rowId === rowId ? { ...c, input: revised.input, whatToCheck: revised.whatToCheck } : c,
			) ?? null;

		await runSuiteDataset();
	} catch (error) {
		if (!isMounted) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.generateError'));
	} finally {
		if (isMounted) revisingRowId.value = null;
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
			<EvalInitialSample
				:preview-input="previewInput"
				:preview-output="previewOutput ?? ''"
				hide-banner
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
				:revising-row-id="revisingRowId"
				@add-example="onAddExample"
				@check-agent="onCheckAgent"
				@stop-run="onStopSuiteRun"
				@revise-case="onReviseCase"
				@rerun-case="onRerunCase"
				@update-what-to-check="onUpdateWhatToCheck"
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
