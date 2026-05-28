<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	N8nBadge,
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type {
	ChatHubConversationModel,
	ChatHubLLMProvider,
	ChatHubProvider,
	ChatModelDto,
} from '@n8n/api-types';

import { isSubNodeType } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';
import { useToast } from '@/app/composables/useToast';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { formatMetricPercent, formatDuration, formatTokens } from '../../evaluation.utils';
import {
	CANNED_METRICS,
	LLM_JUDGE_METRIC_KEYS,
	getExpectedFieldsForMetrics,
	type CannedMetricKey,
} from '../../evaluation.constants';
import { useSliceInputs } from '../../composables/useSliceInputs';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import { useWizardPersistence } from './useWizardPersistence';
import { useWizardHydration } from './useWizardHydration';
import CustomScorerModal from './CustomScorerModal.vue';

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();
const evaluationStore = useEvaluationStore();
const toast = useToast();
const usersStore = useUsersStore();
const chatStore = useChatStore();

const {
	activeStep,
	selectedMetricKeys,
	judgeSelectionByMetric,
	aiNodeName,
	isSliceMode,
	startNodeName,
	endNodeName,
	inputs,
	expectedValues,
	customScorers,
} = storeToRefs(wizardStore);

// Chat-hub model selector backing data — credentials are user-scoped (shared
// across all selected LLM-judge metrics), but each metric tracks its own
// provider/model in `judgeSelectionByMetric`.
//
// `useChatCredentials` closes over the user id at the moment it's called.
// If `currentUserId` is still null when the wizard mounts, the composable
// would permanently bind to the 'anonymous' localStorage bucket. In practice
// the wizard's CTAs render after the user is loaded, but defensively we also
// watch `currentUserId` below and re-fetch agents once it transitions to a
// real id so the picker isn't left with stale 'anonymous' credentials.
const currentUserId = computed(() => usersStore.currentUserId);
const { credentialsByProvider, selectCredential } = useChatCredentials(
	currentUserId.value ?? 'anonymous',
);

watch(
	[credentialsByProvider, currentUserId],
	([creds, userId]) => {
		if (!creds || !userId) return;
		// Surface fetchAgents failures (network / auth / parse) instead of
		// silently leaving the ModelSelector with an empty provider list.
		chatStore.fetchAgents(creds).catch((error) => {
			toast.showError(
				error,
				locale.baseText('evaluations.wizardSidepanel.step1.judgeMissingCredential'),
			);
		});
	},
	{ immediate: true },
);

const agentsResponse = computed(() => chatStore.agents);

// Step 1 surfaces the canned `metric` options from the Set Metrics operation
// of the Evaluation node — the same fixed list users see in the node
// parameters today.
const cannedMetrics = computed(() => CANNED_METRICS);

// Slice picker shouldn't list AI sub-nodes (language models, memory, tools,
// embeddings, …) — they live off `ai_*` connections and can never sit on the
// `main` chain that the wizard's slice runs along. `isSubNodeType` keys off
// the node type's declared outputs, which is reliable across versions.
const nodeNameOptions = computed(() =>
	workflowDocumentStore.value.allNodes
		.filter((node) => !isSubNodeType(nodeTypesStore.getNodeType(node.type) ?? null))
		.map((node) => ({ name: node.name })),
);

const aiRootNodes = useAiRootNodes();

// Seed `aiNodeName` with the first AI root node the moment the user reaches
// step 2 (and only if the store doesn't already have a pick — preserves user
// edits across navigation back/forward). If the workflow legitimately has no
// AI node we leave the field empty; the wizard's entry gate upstream ensures
// this is the rare path.
//
// We also nudge a refresh of `lastSuccessfulExecution` here — its cached
// value is only set on workflow init / logs-panel reset, so a chat-triggered
// run made right before opening the wizard wouldn't otherwise appear. Errors
// are swallowed inside `fetchLastSuccessfulExecution` already.
watch(
	[activeStep, aiRootNodes],
	([step, nodes]) => {
		if (step !== 1) return;
		void workflowsStore.fetchLastSuccessfulExecution();
		if (wizardStore.aiNodeName) return;
		const first = nodes[0];
		if (first) wizardStore.setAiNodeName(first.name);
	},
	{ immediate: true },
);

const sliceInputs = useSliceInputs();
const expectedFields = computed(() => getExpectedFieldsForMetrics(selectedMetricKeys.value));

// Pre-fill input fields from the most recent execution. Re-runs whenever the
// slice or execution data changes; user edits are preserved via seedInputs.
watch(
	sliceInputs,
	({ values, fieldNames }) => {
		if (fieldNames.length === 0) return;
		wizardStore.seedInputs(values);
	},
	{ immediate: true },
);

const { persistAndDispatch, isPersisting } = useWizardPersistence();
const { hydrate } = useWizardHydration();

// Hydrate from the latest persisted EvaluationConfig whenever the wizard is
// opened — the store's `open()` resets state first, so this safely overrides
// the empty defaults without clobbering anything the user has already typed.
// Errors inside `hydrate` are swallowed by the composable (it toasts) so we
// don't need to handle them here.
watch(
	() => wizardStore.isOpen,
	(isOpen) => {
		if (isOpen) void hydrate();
	},
	{ immediate: true },
);

const runs = computed(() => {
	const id = workflowDocumentStore.value.workflowId;
	return Object.values(evaluationStore.testRunsById ?? {}).filter(
		({ workflowId }) => workflowId === id,
	);
});

const latestRun = computed(() => runs.value[runs.value.length - 1]);

// Test case execution for the latest run. The wizard always dispatches a
// single-row dataset, so there's only ever one case per run. The store's
// poller already calls `fetchTestCaseExecutions` as soon as the run reaches
// a terminal status, so by the time step 3 leaves the loading state this
// lookup is populated.
const latestRunCase = computed(() => {
	const runId = latestRun.value?.id;
	if (!runId) return undefined;
	return Object.values(evaluationStore.testCaseExecutionsById ?? {}).find(
		(c) => c.testRunId === runId,
	);
});

// Resolve the slice's end node — the source of the "output" the user wants
// to see in step 3. Single-AI-node mode keeps it in `aiNodeName`; slice mode
// keeps it in `endNodeName`. Falls back to the persisted end name via the
// latest run's stored config if both wizard fields are blank (e.g. after a
// reload before hydration finished).
const sliceEndNodeName = computed(
	() => (wizardStore.isSliceMode ? wizardStore.endNodeName : wizardStore.aiNodeName) || '',
);

// Workflow executions for completed test cases — fetched lazily and cached
// by executionId. We can't store this in a pinia store cleanly without
// stepping on the workflow's own execution slots, and the wizard only needs
// it for the result preview.
const executionsByCaseId = ref<Record<string, IExecutionResponse | null>>({});

// Pretty-printed first-item JSON output of the slice's end node, sourced
// from the actual workflow execution that ran this case. We read
// `runData[endNode][0].data.main[0][0].json` — the same shape n8n stores
// every node's output under — so what the user sees is exactly what flowed
// out of the slice.
const latestRunOutputText = computed(() => {
	const caseRecord = latestRunCase.value;
	if (!caseRecord?.executionId) return undefined;
	const execution = executionsByCaseId.value[caseRecord.id];
	if (!execution) return undefined;
	const endName = sliceEndNodeName.value;
	if (!endName) return undefined;
	const runData = execution.data?.resultData?.runData;
	const firstItem = runData?.[endName]?.[0]?.data?.main?.[0]?.[0]?.json;
	if (firstItem === undefined) return undefined;
	return formatOutputValue(firstItem);
});

async function loadExecutionForCase(caseId: string, executionId: string) {
	if (caseId in executionsByCaseId.value) return;
	// Reserve the slot so concurrent watchers don't refetch.
	executionsByCaseId.value = { ...executionsByCaseId.value, [caseId]: null };
	try {
		const execution = await executionsStore.fetchExecution(executionId);
		executionsByCaseId.value = {
			...executionsByCaseId.value,
			[caseId]: execution ?? null,
		};
	} catch {
		// Best-effort — leave the slot as `null` so we fall back to the
		// placeholder copy. Refetching on every recomputation would mask
		// transient failures behind retries the user can't see.
	}
}

function formatOutputValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

// Fetch the workflow execution behind the latest run's test case so the
// output block can render it. Reactively triggers once the case row's
// executionId is known.
watch(
	latestRunCase,
	(caseRecord) => {
		if (!caseRecord?.executionId) return;
		void loadExecutionForCase(caseRecord.id, caseRecord.executionId);
	},
	{ immediate: true },
);

// Pull test case executions for the latest run as soon as step 3 is shown.
// The store's poller already does this while the run is in flight, but on a
// page reload / hot navigation back to the wizard the poller never ran —
// without this fetch the output block stays empty even though the case
// finished server-side.
watch(
	[activeStep, latestRun],
	([step, run]) => {
		if (step !== 2 || !run) return;
		if (['new', 'running'].includes(run.status)) return;
		const workflowId = workflowDocumentStore.value?.workflowId;
		if (!workflowId) return;
		void evaluationStore.fetchTestCaseExecutions({ workflowId, runId: run.id });
	},
	{ immediate: true },
);
// `new` is the brief window between createTestRun and the runner's first
// execute step — treat it as in-progress so the wizard doesn't flash an
// empty results view before polling kicks in.
const isRunning = computed(() =>
	latestRun.value ? ['new', 'running'].includes(latestRun.value.status) : false,
);
// On step 3, before the first poll lands we still want the loading state
// rather than the empty-state. After dispatch from step 2 the wizard always
// has a latestRun, but this defensively covers reload/refresh paths.
const showLoadingState = computed(
	() => isRunning.value || (activeStep.value === 2 && !latestRun.value),
);

const step1Complete = computed(() => {
	// At least one scorer (canned OR custom) must be configured to advance.
	if (selectedMetricKeys.value.length === 0 && customScorers.value.length === 0) return false;
	// Every selected LLM-judge canned metric must have a model picked. Non-LLM
	// canned metrics (stringSimilarity / categorization / toolsUsed) gate only
	// on being selected. Custom scorers carry their own configuration when
	// added via the modal, so they don't need a separate gate here.
	for (const key of selectedMetricKeys.value) {
		if (LLM_JUDGE_METRIC_KEYS.has(key) && !judgeSelectionByMetric.value[key]) return false;
	}
	return true;
});

function isLlmJudgeMetric(key: CannedMetricKey): boolean {
	return LLM_JUDGE_METRIC_KEYS.has(key);
}

// Build the ModelSelector's `selectedAgent` from whatever the user picked for
// this metric. Falls back to the catalog entry so the picker shows the
// canonical name/icon instead of just the raw model id.
function selectedAgentForMetric(key: CannedMetricKey): ChatModelDto | null {
	const sel = judgeSelectionByMetric.value[key];
	if (!sel) return null;
	const entry = agentsResponse.value[sel.provider]?.models.find(
		(m) => isLlmProviderModel(m.model) && m.model.model === sel.model,
	);
	if (entry) return entry;
	return {
		model: { provider: sel.provider, model: sel.model } as ChatHubConversationModel,
		name: sel.model,
		description: null,
		icon: null,
		updatedAt: null,
		createdAt: null,
		metadata: {} as ChatModelDto['metadata'],
		groupName: null,
		groupIcon: null,
	};
}

function onJudgeModelChange(key: CannedMetricKey, selection: ChatHubConversationModel) {
	if (!isLlmProviderModel(selection)) return;
	const credentialId = credentialsByProvider.value?.[selection.provider];
	if (!credentialId) {
		toast.showError(
			new Error('Pick a credential for this provider first'),
			locale.baseText('evaluations.wizardSidepanel.step1.judgeMissingCredential'),
		);
		return;
	}
	wizardStore.setJudgeSelection(key, {
		provider: selection.provider as ChatHubLLMProvider,
		credentialId,
		model: selection.model,
	});
}

function onJudgeCredentialChange(
	key: CannedMetricKey,
	provider: ChatHubProvider,
	credentialId: string | null,
) {
	selectCredential(provider, credentialId);
	// If this metric's selection used the same provider, refresh its credential.
	const current = judgeSelectionByMetric.value[key];
	if (current && current.provider === provider && credentialId) {
		wizardStore.setJudgeSelection(key, { ...current, credentialId });
	}
}
const step2Complete = computed(() => {
	const slicePicked = isSliceMode.value
		? Boolean(startNodeName.value && endNodeName.value)
		: Boolean(aiNodeName.value);
	if (!slicePicked) return false;
	if (!sliceInputs.value.hasExecution) return false;
	const inputsFilled = sliceInputs.value.fieldNames.every(
		(name) => (inputs.value[name] ?? '').length > 0,
	);
	const expectedFilled = expectedFields.value.every(
		(f) => (expectedValues.value[f.name] ?? '').length > 0,
	);
	return inputsFilled && expectedFilled;
});

const titleKey = computed(() =>
	activeStep.value === 0
		? 'evaluations.wizardSidepanel.step1.title'
		: activeStep.value === 1
			? 'evaluations.wizardSidepanel.step2.title'
			: 'evaluations.wizardSidepanel.step3.title',
);

const descriptionKey = computed(() =>
	activeStep.value === 0
		? 'evaluations.wizardSidepanel.step1.description'
		: activeStep.value === 1
			? 'evaluations.wizardSidepanel.step2.description'
			: 'evaluations.wizardSidepanel.step3.description',
);

function metricScorePercent(key: string): number {
	const metric = cannedMetrics.value.find((m) => m.key === key);
	const raw = latestRun.value?.metrics?.[key];
	const text = formatMetricPercent(raw, { category: metric?.category });
	const parsed = Number.parseFloat(text);
	return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

async function handleNext() {
	const current = activeStep.value;
	if (current === 0) {
		wizardStore.goNext();
		return;
	}
	if (current === 1) {
		// Persist everything (Data table + first row + EvaluationConfig) and
		// kick off the run before advancing. Step 3 reads results from the
		// evaluation store and shows running/output state as they arrive.
		const ok = await persistAndDispatch();
		if (!ok) return;
		wizardStore.goNext();
	}
}

function handleCancel() {
	wizardStore.close();
}

function handleBack() {
	wizardStore.goBack();
}

function handleFinish() {
	wizardStore.close();
}
</script>

<template>
	<!--
		Renders unconditionally — the FocusSidebar parent already gates this
		via the active tab. Keeping the v-if here too would double-mount/unmount
		on tab switches and reset transient component state.
	-->
	<div :class="$style.sidepanel" data-test-id="evaluations-wizard-sidepanel">
		<!--
			Segmented progress bar at the top — one segment per step, fills
			brand-orange as the user advances. Replaces the dot-with-number
			progress indicator I had earlier; matches the Figma spec.
		-->
		<div :class="$style.progressBar" data-test-id="evaluations-wizard-sidepanel-progress">
			<div
				v-for="step in 3"
				:key="step"
				:class="[
					$style.progressSegment,
					activeStep >= step - 1 ? $style.progressSegmentActive : null,
				]"
			></div>
		</div>

		<header :class="$style.header">
			<N8nText tag="h2" size="large" color="text-dark" bold :class="$style.title">
				{{ locale.baseText(titleKey) }}
			</N8nText>
			<N8nText size="small" color="text-base" :class="$style.description">
				{{ locale.baseText(descriptionKey) }}
			</N8nText>
		</header>

		<div :class="$style.body">
			<!-- Step 1 — Setup scorers (canned metric cards) -->
			<section v-if="activeStep === 0" :class="$style.section">
				<ul :class="$style.scorerList">
					<li
						v-for="metric in cannedMetrics"
						:key="metric.key"
						:class="[
							$style.scorerCard,
							selectedMetricKeys.includes(metric.key) ? $style.scorerCardSelected : null,
						]"
						:data-test-id="`evaluations-wizard-sidepanel-metric-${metric.key}`"
						role="button"
						tabindex="0"
						@click="wizardStore.toggleMetric(metric.key)"
						@keydown.enter.prevent="wizardStore.toggleMetric(metric.key)"
						@keydown.space.prevent="wizardStore.toggleMetric(metric.key)"
					>
						<span
							:class="$style.scorerIcon"
							:style="{ backgroundColor: metric.tileBg, color: metric.tileFg }"
						>
							<N8nIcon :icon="metric.icon" size="small" />
						</span>
						<div :class="$style.scorerBody">
							<div :class="$style.scorerTitleRow">
								<N8nText size="small" bold color="text-dark">
									{{ locale.baseText(metric.labelKey) }}
								</N8nText>
								<N8nBadge :class="$style.judgePill">
									{{ locale.baseText('evaluations.wizardSidepanel.metric.judgeTag') }}
								</N8nBadge>
							</div>
							<N8nText size="small" color="text-base" :class="$style.scorerDescription">
								{{ locale.baseText(metric.descriptionKey) }}
							</N8nText>
						</div>
						<span
							v-if="selectedMetricKeys.includes(metric.key)"
							:class="$style.scorerCheck"
							aria-hidden="true"
						>
							<N8nIcon icon="check" size="small" />
						</span>

						<!--
							LLM-judge picker. Renders only when the metric is selected
							AND it's an LLM-judge type. .stop on click/keydown prevents
							the card's toggle handler from firing inside the picker.
						-->
						<div
							v-if="selectedMetricKeys.includes(metric.key) && isLlmJudgeMetric(metric.key)"
							:class="$style.scorerJudgePicker"
							:data-test-id="`evaluations-wizard-sidepanel-judge-${metric.key}`"
							@click.stop
							@keydown.stop
						>
							<N8nText size="xsmall" color="text-base">
								{{ locale.baseText('evaluations.wizardSidepanel.step1.judgeLabel') }}
							</N8nText>
							<ModelSelector
								:selected-agent="selectedAgentForMetric(metric.key)"
								:include-custom-agents="false"
								:credentials="credentialsByProvider"
								:agents="agentsResponse"
								:is-loading="false"
								:warn-missing-credentials="true"
								horizontal
								@change="(m) => onJudgeModelChange(metric.key, m)"
								@select-credential="
									(provider, credentialId) =>
										onJudgeCredentialChange(metric.key, provider, credentialId)
								"
							/>
						</div>
					</li>

					<!--
						User-defined scorers added via the custom scorer modal. Rendered
						between the canned metrics and the "+ New custom scorer" affordance
						so newly added scorers appear in place. Custom scorers are always
						"selected" once added — the trash icon is the only way to remove
						them, which keeps the model below faithful to what the user can
						later persist.
					-->
					<li
						v-for="scorer in customScorers"
						:key="scorer.id"
						:class="[$style.scorerCard, $style.scorerCardSelected]"
						:data-test-id="`evaluations-wizard-sidepanel-custom-scorer-${scorer.id}`"
					>
						<span :class="[$style.scorerIcon, $style.scorerIconNeutral]">
							<N8nIcon icon="code" size="small" />
						</span>
						<div :class="$style.scorerBody">
							<div :class="$style.scorerTitleRow">
								<N8nText size="small" bold color="text-dark">
									{{ scorer.name }}
								</N8nText>
								<N8nBadge :class="$style.judgePill">
									{{ locale.baseText('evaluations.wizardSidepanel.customScorer.expressionTag') }}
								</N8nBadge>
							</div>
						</div>
						<button
							type="button"
							:class="$style.scorerRemove"
							:aria-label="locale.baseText('evaluations.wizardSidepanel.customScorer.remove')"
							:data-test-id="`evaluations-wizard-sidepanel-custom-scorer-remove-${scorer.id}`"
							@click.stop="wizardStore.removeCustomScorer(scorer.id)"
						>
							<N8nIcon icon="trash-2" size="small" />
						</button>
					</li>

					<!-- "+ New custom scorer" affordance — last card in the list -->
					<li
						:class="[$style.scorerCard, $style.scorerCardAdd]"
						role="button"
						tabindex="0"
						data-test-id="evaluations-wizard-sidepanel-new-custom-scorer"
						@click="wizardStore.openCustomScorerModal()"
						@keydown.enter.prevent="wizardStore.openCustomScorerModal()"
						@keydown.space.prevent="wizardStore.openCustomScorerModal()"
					>
						<span :class="[$style.scorerIcon, $style.scorerIconNeutral]">
							<N8nIcon icon="plus" size="small" />
						</span>
						<N8nText size="small" color="text-base">
							{{ locale.baseText('evaluations.wizardSidepanel.step1.newCustomScorer') }}
						</N8nText>
					</li>
				</ul>
			</section>

			<!-- Step 2 — Setup target + one dataset entry -->
			<section v-if="activeStep === 1" :class="$style.section">
				<div :class="$style.formBlock">
					<!--
						Default: a single picker for the AI node whose output gets
						evaluated. Pre-seeded with the first AI root node in the
						workflow. The "Extend to a slice" affordance below swaps in
						an explicit Start + End pair when the user needs more control.
					-->
					<div
						v-if="!isSliceMode"
						:class="$style.sliceFields"
						data-test-id="evaluations-wizard-sidepanel-ai-node-picker"
					>
						<div :class="$style.field">
							<N8nText size="xsmall" color="text-base">
								{{ locale.baseText('evaluations.wizardSidepanel.step2.aiNode') }}
							</N8nText>
							<N8nSelect
								v-model="aiNodeName"
								size="small"
								filterable
								:placeholder="
									locale.baseText('evaluations.wizardSidepanel.step2.aiNode.placeholder')
								"
								data-test-id="evaluations-wizard-sidepanel-ai-node-select"
							>
								<N8nOption
									v-for="node in aiRootNodes"
									:key="node.name"
									:label="node.name"
									:value="node.name"
								/>
							</N8nSelect>
							<button
								type="button"
								:class="$style.sliceModeLink"
								data-test-id="evaluations-wizard-sidepanel-extend-to-slice"
								@click="wizardStore.enterSliceMode()"
							>
								{{ locale.baseText('evaluations.wizardSidepanel.step2.extendToSlice') }}
							</button>
						</div>
					</div>

					<div
						v-else
						:class="$style.sliceFields"
						data-test-id="evaluations-wizard-sidepanel-slice-picker"
					>
						<div :class="$style.field">
							<N8nText size="xsmall" color="text-base">
								{{ locale.baseText('evaluations.wizardSidepanel.step2.start') }}
							</N8nText>
							<N8nSelect
								v-model="startNodeName"
								size="small"
								filterable
								:placeholder="
									locale.baseText('evaluations.wizardSidepanel.step2.start.placeholder')
								"
								data-test-id="evaluations-wizard-sidepanel-start-select"
							>
								<N8nOption
									v-for="node in nodeNameOptions"
									:key="node.name"
									:label="node.name"
									:value="node.name"
								/>
							</N8nSelect>
						</div>
						<div :class="$style.field">
							<N8nText size="xsmall" color="text-base">
								{{ locale.baseText('evaluations.wizardSidepanel.step2.end') }}
							</N8nText>
							<N8nSelect
								v-model="endNodeName"
								size="small"
								filterable
								:placeholder="locale.baseText('evaluations.wizardSidepanel.step2.end.placeholder')"
								data-test-id="evaluations-wizard-sidepanel-end-select"
							>
								<N8nOption
									v-for="node in nodeNameOptions"
									:key="node.name"
									:label="node.name"
									:value="node.name"
								/>
							</N8nSelect>
							<button
								type="button"
								:class="$style.sliceModeLink"
								data-test-id="evaluations-wizard-sidepanel-reset-to-ai-node"
								@click="wizardStore.exitSliceMode()"
							>
								{{ locale.baseText('evaluations.wizardSidepanel.step2.resetToAiNode') }}
							</button>
						</div>
					</div>

					<!--
						No execution yet → we can't determine the slice's input shape.
						Surface an empty-state inside the card so the user understands
						they need to run the workflow first.
					-->
					<div
						v-if="!sliceInputs.hasExecution"
						:class="$style.field"
						data-test-id="evaluations-wizard-sidepanel-no-execution"
					>
						<N8nText size="small" color="text-base">
							{{ locale.baseText('evaluations.wizardSidepanel.step2.noExecution') }}
						</N8nText>
					</div>

					<!-- One field per detected input on the slice's first item. -->
					<div
						v-for="name in sliceInputs.fieldNames"
						v-else
						:key="`input-${name}`"
						:class="$style.field"
						:data-test-id="`evaluations-wizard-sidepanel-input-${name}`"
					>
						<N8nText size="xsmall" color="text-base">
							{{ name }}
						</N8nText>
						<N8nInput
							:model-value="inputs[name] ?? ''"
							type="textarea"
							:rows="3"
							size="small"
							:placeholder="locale.baseText('evaluations.wizardSidepanel.step2.input.placeholder')"
							@update:model-value="wizardStore.setInputValue(name, $event)"
						/>
					</div>

					<!--
						Expected fields derived from selected metrics. Same column
						name as the Set Metrics operation reads (expectedAnswer,
						expectedTools) so the dataset row maps 1:1 on the backend.
					-->
					<div
						v-for="field in expectedFields"
						:key="`expected-${field.name}`"
						:class="$style.field"
						:data-test-id="`evaluations-wizard-sidepanel-expected-${field.name}`"
					>
						<div :class="$style.fieldLabel">
							<N8nText size="xsmall" color="text-base">
								{{ locale.baseText(field.labelKey as BaseTextKey) }}
							</N8nText>
							<N8nTooltip
								placement="top"
								:content="locale.baseText('evaluations.wizardSidepanel.step2.expected.tooltip')"
							>
								<N8nIcon icon="info" size="xsmall" :class="$style.fieldLabelInfo" />
							</N8nTooltip>
						</div>
						<N8nInput
							:model-value="expectedValues[field.name] ?? ''"
							type="textarea"
							:rows="3"
							size="small"
							:placeholder="
								locale.baseText('evaluations.wizardSidepanel.step2.expectedFieldPlaceholder')
							"
							@update:model-value="wizardStore.setExpectedValue(field.name, $event)"
						/>
					</div>
				</div>
			</section>

			<!-- Step 3 — Run tests + per-scorer result cards -->
			<section v-if="activeStep === 2" :class="$style.section">
				<!--
					Loading state: shown while the run is queued ('new') or
					actively executing ('running'). One pulsing skeleton per
					selected scorer so the wait reads as multi-step progress,
					and a banner spinner up top so the overall state is obvious.
					This view fully replaces the result list while in flight —
					the result `<ul>` only renders once the run reaches a
					terminal status (success/completed/error/warning).
				-->
				<div
					v-if="showLoadingState"
					:class="$style.runningState"
					data-test-id="evaluations-wizard-sidepanel-running"
				>
					<N8nIcon icon="spinner" size="medium" :spin="true" />
					<N8nText size="small" color="text-base">
						{{ locale.baseText('evaluations.wizardSidepanel.step3.running') }}
					</N8nText>
				</div>
				<ul
					v-if="showLoadingState"
					:class="$style.scorerList"
					data-test-id="evaluations-wizard-sidepanel-loading-skeletons"
				>
					<li
						v-for="metric in cannedMetrics.filter((m) => selectedMetricKeys.includes(m.key))"
						:key="`skeleton-${metric.key}`"
						:class="[$style.resultCard, $style.resultCardLoading]"
					>
						<div :class="$style.resultHeader">
							<span
								:class="$style.scorerIcon"
								:style="{ backgroundColor: metric.tileBg, color: metric.tileFg }"
							>
								<N8nIcon :icon="metric.icon" size="small" />
							</span>
							<div :class="$style.scorerBody">
								<N8nText size="small" bold color="text-dark">
									{{ locale.baseText(metric.labelKey) }}
								</N8nText>
								<N8nText size="xsmall" color="text-light">
									{{ locale.baseText('evaluations.wizardSidepanel.step3.scoring') }}
								</N8nText>
							</div>
						</div>
						<div :class="$style.progressTrack">
							<div :class="[$style.progressFill, $style.progressFillIndeterminate]"></div>
						</div>
					</li>
				</ul>

				<ul
					v-if="latestRun && !showLoadingState"
					:class="$style.scorerList"
					data-test-id="evaluations-wizard-sidepanel-results"
				>
					<li
						v-for="metric in cannedMetrics.filter((m) => selectedMetricKeys.includes(m.key))"
						:key="metric.key"
						:class="$style.resultCard"
					>
						<div :class="$style.resultHeader">
							<span
								:class="$style.scorerIcon"
								:style="{ backgroundColor: metric.tileBg, color: metric.tileFg }"
							>
								<N8nIcon :icon="metric.icon" size="small" />
							</span>
							<div :class="$style.scorerBody">
								<div :class="$style.scorerTitleRow">
									<N8nText size="small" bold color="text-dark">
										{{ locale.baseText(metric.labelKey) }}
									</N8nText>
									<N8nBadge :class="$style.judgePill">
										{{ locale.baseText('evaluations.wizardSidepanel.metric.judgeTag') }}
									</N8nBadge>
								</div>
								<N8nText size="small" color="text-base" :class="$style.scorerDescription">
									{{ locale.baseText(metric.descriptionKey) }}
								</N8nText>
							</div>
						</div>

						<div :class="$style.resultScoreRow">
							<N8nText size="xsmall" color="text-base">
								{{ locale.baseText('evaluations.wizardSidepanel.step3.testLabel') }}
							</N8nText>
							<N8nText size="xsmall" bold color="text-dark">
								{{
									formatMetricPercent(latestRun.metrics?.[metric.key], {
										category: metric.category,
									})
								}}
							</N8nText>
						</div>
						<div :class="$style.progressTrack">
							<div
								:class="[$style.progressFill, $style[`progressFill_${metric.category}`]]"
								:style="{ width: `${metricScorePercent(metric.key)}%` }"
							></div>
						</div>

						<div :class="$style.outputBlock">
							<N8nText size="xsmall" color="text-base">
								{{ locale.baseText('evaluations.wizardSidepanel.step3.output') }}
							</N8nText>
							<N8nText size="small" color="text-dark" :class="$style.outputText">
								{{
									latestRunOutputText ||
									locale.baseText('evaluations.wizardSidepanel.step3.outputPlaceholder')
								}}
							</N8nText>
							<N8nText size="xsmall" color="text-light">
								{{ formatTokens(latestRun.metrics?.totalTokens) }}
								·
								{{ formatDuration(latestRun.metrics?.executionTime) }}
							</N8nText>
						</div>
					</li>
				</ul>

				<div
					v-if="!latestRun && !showLoadingState"
					:class="$style.emptyResult"
					data-test-id="evaluations-wizard-sidepanel-no-run"
				>
					<N8nText size="small" color="text-light">
						{{ locale.baseText('evaluations.wizardSidepanel.step3.noRun') }}
					</N8nText>
				</div>
			</section>
		</div>

		<footer :class="$style.footer">
			<!--
				Step 1: "Cancel" (ghost) closes the wizard — no prior step to go back to.
				Step 2: "Back" (ghost) returns to step 1.
				Step 3: "Done" only — wizard is complete.
				N8nButton uses `variant` (not `type`) for its visual style; the
				native `type` attribute MUST stay "button" so the click never
				gets treated as a form submit.
			-->
			<N8nButton
				v-if="activeStep === 0"
				variant="ghost"
				size="small"
				type="button"
				data-test-id="evaluations-wizard-sidepanel-cancel"
				@click.stop="handleCancel"
			>
				{{ locale.baseText('evaluations.wizardSidepanel.cancel') }}
			</N8nButton>
			<N8nButton
				v-else-if="activeStep === 1"
				variant="ghost"
				size="small"
				type="button"
				data-test-id="evaluations-wizard-sidepanel-back"
				@click.stop="handleBack"
			>
				{{ locale.baseText('evaluations.wizardSidepanel.back') }}
			</N8nButton>
			<span :class="$style.footerSpacer" />
			<N8nButton
				v-if="activeStep < 2"
				variant="outline"
				size="small"
				type="button"
				:loading="isPersisting"
				:disabled="(activeStep === 0 && !step1Complete) || (activeStep === 1 && !step2Complete)"
				data-test-id="evaluations-wizard-sidepanel-next"
				@click.stop="handleNext"
			>
				{{ locale.baseText('evaluations.wizardSidepanel.next') }}
			</N8nButton>
			<N8nButton
				v-else
				variant="outline"
				size="small"
				type="button"
				data-test-id="evaluations-wizard-sidepanel-done"
				@click.stop="handleFinish"
			>
				{{ locale.baseText('evaluations.wizardSidepanel.done') }}
			</N8nButton>
		</footer>

		<CustomScorerModal />
	</div>
</template>

<style module lang="scss">
.sidepanel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	background-color: var(--background--surface);
	overflow: hidden;
}

.progressBar {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 4px;
	padding: var(--spacing--xs) var(--spacing--md) 0;
}

.progressSegment {
	height: 3px;
	border-radius: 2px;
	background-color: var(--background--subtle);
	transition: background-color var(--duration--snappy) ease;
}

.progressSegmentActive {
	background-color: var(--background--brand);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--md);
	padding-bottom: var(--spacing--xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--md, 18px);
}

.description {
	display: block;
	max-width: 340px;
}

.body {
	flex: 1 1 auto;
	overflow-y: auto;
	padding: var(--spacing--xs) var(--spacing--md) var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.scorerList {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

// Each scorer = themed icon tile | name + LLM-as-Judge pill + description |
// orange check (when selected). Layout uses grid so the check column is
// reserved even when empty, keeping rows aligned.
.scorerCard {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	// Match the marquee tile rounding from EvaluationsCanvasInfoCard so the
	// wizard's scorer cards feel like the same component family.
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	cursor: pointer;
	transition:
		border-color var(--duration--snappy) ease,
		box-shadow var(--duration--snappy) ease;
	outline: none;

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
	}
}

.scorerCardSelected,
.scorerCardSelected:hover,
.scorerCardSelected:focus-visible {
	border-color: var(--background--brand);
	box-shadow: 0 0 0 1px var(--background--brand);
}

.scorerCardAdd {
	grid-template-columns: auto 1fr;
	color: var(--color--text--tint-1);

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
	}
}

.scorerIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 6px;
}

.scorerIconNeutral {
	background-color: var(--background--subtle);
	color: var(--color--text--tint-1);
}

.scorerBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.scorerTitleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.scorerDescription {
	display: block;
	line-height: 1.4;
}

.judgePill {
	background-color: var(--background--subtle);
	color: var(--color--text--tint-1);
	border: none;
	font-size: 10px;
	padding: 2px 6px;
	border-radius: 999px;
	line-height: 1.2;
	font-weight: var(--font-weight--medium);
}

.scorerCheck {
	display: inline-flex;
	align-items: flex-start;
	justify-content: center;
	color: var(--background--brand);
	padding-top: 2px;
}

.scorerRemove {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	padding: var(--spacing--3xs);
	margin: calc(-1 * var(--spacing--3xs));
	border-radius: var(--border-radius--base);
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: var(--color--danger);
		background-color: var(--background--subtle);
	}

	&:focus-visible {
		outline: 1px solid var(--focus--border-color);
	}
}

// Spans all three grid columns of the parent card so the model picker sits
// below the title/description row at full width.
.scorerJudgePicker {
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--xs);
	border-top: var(--border);
	cursor: default;
}

.formBlock {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--border-radius--base);
	background-color: var(--background--surface);
	overflow: hidden;
}

.sliceModeLink {
	align-self: flex-start;
	background: transparent;
	border: none;
	padding: 0;
	margin-top: var(--spacing--3xs);
	color: var(--color--primary, var(--background--brand));
	font-size: var(--font-size--2xs);
	cursor: pointer;
	text-decoration: none;

	&:hover,
	&:focus-visible {
		text-decoration: underline;
	}

	&:focus-visible {
		outline: 1px solid var(--focus--border-color);
		outline-offset: 2px;
	}
}

.sliceFields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
	background-color: var(--background--subtle);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}

	// Input/Expected output read as flowing text in the design — drop the
	// textarea's own chrome so only the surrounding card's border remains.
	:global(.el-textarea__inner) {
		border: none;
		padding: 0;
		background-color: transparent;
		box-shadow: none;
		resize: none;
	}
}

.fieldLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.fieldLabelInfo {
	color: var(--color--text--tint-1);
}

.runningState {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--border-radius--base);
	background-color: var(--background--surface);
}

.emptyResult {
	padding: var(--spacing--md);
	border: 1px dashed var(--border-color--strong);
	border-radius: var(--border-radius--base);
	text-align: center;
}

.resultCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--border-radius--base);
	background-color: var(--background--surface);
}

.resultHeader {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: var(--spacing--xs);
	align-items: flex-start;
}

.resultScoreRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.progressTrack {
	width: 100%;
	height: 6px;
	border-radius: 3px;
	background-color: var(--background--subtle);
	overflow: hidden;
}

.progressFill {
	height: 100%;
	background-color: var(--background--brand);
	transition: width var(--duration--snappy) ease;
}

// Indeterminate sweep used by per-scorer skeleton cards while the run is in
// flight. A narrow brand-coloured slug shuttles left → right against the
// neutral track. `width: 40%` paired with a -40% to 100% translateX keeps the
// slug always partially visible so the motion reads as activity rather than
// a fade in / out.
.progressFillIndeterminate {
	width: 40%;
	background-color: var(--background--brand);
	animation: progressFillSlide 1.4s ease-in-out infinite;
}

@keyframes progressFillSlide {
	0% {
		transform: translateX(-40%);
	}
	100% {
		transform: translateX(250%);
	}
}

.resultCardLoading {
	// Sub-cards keep their layout but read as “waiting” via a slightly muted
	// title row. Avoids a full opacity dim (which makes icons look broken).
	.scorerBody {
		opacity: 0.85;
	}
}

// Per-category progress fill colour, matching the scorer tile family.
.progressFill_aiBased {
	background-color: var(--color--green--shade-1, #1a8d4a);
}
.progressFill_stringSimilarity {
	background-color: var(--color--purple--shade-1, #6b3fc4);
}
.progressFill_categorization {
	background-color: var(--color--yellow--shade-1, #c98a04);
}
.progressFill_toolsUsed {
	background-color: var(--color--teal--shade-1, #128172);
}
.progressFill_custom {
	background-color: var(--background--brand);
}

.outputBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.outputText {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: 1.4;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: var(--border);
	background-color: var(--background--surface);
}

.footerSpacer {
	flex: 1 1 auto;
}
</style>
