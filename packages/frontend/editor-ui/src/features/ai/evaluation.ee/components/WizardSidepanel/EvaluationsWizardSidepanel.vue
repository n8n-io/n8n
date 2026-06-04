<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type {
	ChatHubConversationModel,
	ChatHubLLMProvider,
	ChatHubProvider,
	ChatModelDto,
} from '@n8n/api-types';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
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
import { useDefaultJudgeSelection } from '../../composables/useDefaultJudgeSelection';
import { useWizardPersistence } from './useWizardPersistence';
import { useWizardHydration } from './useWizardHydration';
import CheckCard from './CheckCard.vue';
import CheckResultCard from './CheckResultCard.vue';
import TestCaseForm from './TestCaseForm.vue';
import CustomCheckModal from './CustomCheckModal.vue';

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
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
	customChecks,
} = storeToRefs(wizardStore);

// useChatCredentials binds to the user id at construction. The canvas route is
// authenticated-only, so currentUserId is always resolved by the time this
// panel mounts; the 'anonymous' fallback mirrors the chat-hub views and never
// fires here.
const currentUserId = computed(() => usersStore.currentUserId);
const { credentialsByProvider, selectCredential } = useChatCredentials(
	currentUserId.value ?? 'anonymous',
);

watch(
	[credentialsByProvider, currentUserId],
	([creds, userId]) => {
		if (!creds || !userId) return;
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
const cannedMetrics = computed(() => CANNED_METRICS);
const aiRootNodes = useAiRootNodes();
const defaultJudgeSelection = useDefaultJudgeSelection();

// Watching judgeSelectionByMetric so a hydrate that drops some keys still
// triggers a re-seed of the rest.
watch(
	[() => wizardStore.isOpen, defaultJudgeSelection, judgeSelectionByMetric],
	([isOpen, defaultSelection, currentSelections]) => {
		if (!isOpen || !defaultSelection) return;
		for (const key of LLM_JUDGE_METRIC_KEYS) {
			if (currentSelections[key]) continue;
			wizardStore.setJudgeSelection(key, defaultSelection);
		}
	},
	{ immediate: true },
);

watch(
	[activeStep, aiRootNodes],
	([step, nodes]) => {
		if (step !== 1) return;
		void workflowsStore.fetchLastSuccessfulExecution();
		void loadFallbackUserExecution();
		if (wizardStore.aiNodeName) return;
		const first = nodes[0];
		if (first) wizardStore.setAiNodeName(first.name);
	},
	{ immediate: true },
);

// Skip evaluation runs — after a few wizard sessions, lastSuccessfulExecution
// would always be the compiled eval workflow, not the user's graph.
async function loadFallbackUserExecution() {
	const workflowId = workflowDocumentStore.value?.workflowId;
	if (!workflowId) return;
	try {
		const list = await executionsStore.fetchExecutions({
			status: ['success'],
			workflowId,
		});
		const candidate = list.results.find((e) => e.mode !== 'evaluation' && typeof e.id === 'string');
		if (!candidate?.id) {
			fallbackUserExecution.value = null;
			return;
		}
		const full = await executionsStore.fetchExecution(candidate.id);
		fallbackUserExecution.value = full ?? null;
	} catch {
		fallbackUserExecution.value = null;
	}
}

const fallbackUserExecution = ref<IExecutionResponse | null>(null);
const sliceInputs = useSliceInputs({ fallbackExecution: fallbackUserExecution });
const expectedFields = computed(() => getExpectedFieldsForMetrics(selectedMetricKeys.value));

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

// Pin to the run dispatched by THIS session via activeRunId; "newest in map"
// would flash an older run between step transition and the new run arriving.
const latestRun = computed(() => {
	const pinnedId = wizardStore.activeRunId;
	if (pinnedId) return evaluationStore.testRunsById?.[pinnedId];
	return runs.value[runs.value.length - 1];
});

const latestRunCase = computed(() => {
	const runId = latestRun.value?.id;
	if (!runId) return undefined;
	return Object.values(evaluationStore.testCaseExecutionsById ?? {}).find(
		(c) => c.testRunId === runId,
	);
});

const sliceEndNodeName = computed(
	() => (wizardStore.isSliceMode ? wizardStore.endNodeName : wizardStore.aiNodeName) || '',
);

const executionsByCaseId = ref<Record<string, IExecutionResponse | null>>({});

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
	executionsByCaseId.value = { ...executionsByCaseId.value, [caseId]: null };
	try {
		const execution = await executionsStore.fetchExecution(executionId);
		executionsByCaseId.value = {
			...executionsByCaseId.value,
			[caseId]: execution ?? null,
		};
	} catch (error) {
		console.warn('[evaluations wizard] failed to load case execution', error);
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

watch(
	latestRunCase,
	(caseRecord) => {
		if (!caseRecord?.executionId) return;
		void loadExecutionForCase(caseRecord.id, caseRecord.executionId);
	},
	{ immediate: true },
);

// On reload/hot-nav into step 3, the store's run poller never ran — fetch
// case executions here so the output block isn't stuck empty.
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
const isRunning = computed(() =>
	latestRun.value ? ['new', 'running'].includes(latestRun.value.status) : false,
);
const showLoadingState = computed(
	() => isRunning.value || (activeStep.value === 2 && !latestRun.value),
);

const step1Complete = computed(() => {
	if (selectedMetricKeys.value.length === 0 && customChecks.value.length === 0) return false;
	for (const key of selectedMetricKeys.value) {
		if (LLM_JUDGE_METRIC_KEYS.has(key) && !judgeSelectionByMetric.value[key]) return false;
	}
	return true;
});

function isLlmJudgeMetric(key: CannedMetricKey): boolean {
	return LLM_JUDGE_METRIC_KEYS.has(key);
}

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
	const current = judgeSelectionByMetric.value[key];
	if (!current || current.provider !== provider) return;
	if (credentialId) {
		wizardStore.setJudgeSelection(key, { ...current, credentialId });
	} else {
		// Credential cleared — drop the stored selection so the removed id can't
		// be persisted or dispatched. The default-judge seed re-fills it if the
		// workflow still offers a usable judge model.
		wizardStore.setJudgeSelection(key, undefined);
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

const STEP_I18N = [
	{
		title: 'evaluations.wizardSidepanel.step1.title',
		description: 'evaluations.wizardSidepanel.step1.description',
	},
	{
		title: 'evaluations.wizardSidepanel.step2.title',
		description: 'evaluations.wizardSidepanel.step2.description',
	},
	{
		title: 'evaluations.wizardSidepanel.step3.title',
		description: 'evaluations.wizardSidepanel.step3.description',
	},
] as const;

const titleKey = computed(() => STEP_I18N[activeStep.value].title);
const descriptionKey = computed(() => STEP_I18N[activeStep.value].description);

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
	<div :class="$style.sidepanel" data-test-id="evaluations-wizard-sidepanel">
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
			<section v-if="activeStep === 0" :class="$style.section">
				<ul :class="$style.checkList">
					<li v-for="metric in cannedMetrics" :key="metric.key">
						<CheckCard
							:icon="metric.icon"
							:icon-bg="metric.tileBg"
							:icon-fg="metric.tileFg"
							:title="locale.baseText(metric.labelKey)"
							:description="locale.baseText(metric.descriptionKey)"
							:badge="
								isLlmJudgeMetric(metric.key)
									? locale.baseText('evaluations.wizardSidepanel.metric.judgeTag')
									: undefined
							"
							:selected="selectedMetricKeys.includes(metric.key)"
							:data-test-id="`evaluations-wizard-sidepanel-metric-${metric.key}`"
							@toggle="wizardStore.toggleMetric(metric.key)"
						>
							<div
								v-if="selectedMetricKeys.includes(metric.key) && isLlmJudgeMetric(metric.key)"
								:data-test-id="`evaluations-wizard-sidepanel-judge-${metric.key}`"
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
						</CheckCard>
					</li>

					<li v-for="check in customChecks" :key="check.id">
						<CheckCard
							icon="code"
							:title="check.name"
							:badge="locale.baseText('evaluations.wizardSidepanel.customCheck.expressionTag')"
							:selected="true"
							:removable="true"
							:remove-aria-label="locale.baseText('evaluations.wizardSidepanel.customCheck.remove')"
							:data-test-id="`evaluations-wizard-sidepanel-custom-check-${check.id}`"
							:remove-test-id="`evaluations-wizard-sidepanel-custom-check-remove-${check.id}`"
							@remove="wizardStore.removeCustomCheck(check.id)"
						/>
					</li>

					<li
						:class="[$style.addCard]"
						role="button"
						tabindex="0"
						data-test-id="evaluations-wizard-sidepanel-new-custom-check"
						@click="wizardStore.openCustomCheckModal()"
						@keydown.enter.prevent="wizardStore.openCustomCheckModal()"
						@keydown.space.prevent="wizardStore.openCustomCheckModal()"
					>
						<span :class="$style.addCardIcon">
							<N8nIcon icon="plus" size="small" />
						</span>
						<N8nText size="small" color="text-base">
							{{ locale.baseText('evaluations.wizardSidepanel.step1.newCustomCheck') }}
						</N8nText>
					</li>
				</ul>
			</section>

			<section v-if="activeStep === 1" :class="$style.section">
				<TestCaseForm :slice-inputs="sliceInputs" />
			</section>

			<section v-if="activeStep === 2" :class="$style.section">
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
					:class="$style.checkList"
					data-test-id="evaluations-wizard-sidepanel-loading-skeletons"
				>
					<li
						v-for="metric in cannedMetrics.filter((m) => selectedMetricKeys.includes(m.key))"
						:key="`skeleton-${metric.key}`"
					>
						<CheckResultCard
							:icon="metric.icon"
							:icon-bg="metric.tileBg"
							:icon-fg="metric.tileFg"
							:title="locale.baseText(metric.labelKey)"
							:badge="
								isLlmJudgeMetric(metric.key)
									? locale.baseText('evaluations.wizardSidepanel.metric.judgeTag')
									: undefined
							"
							:category="metric.category"
							:loading="true"
							:loading-label="locale.baseText('evaluations.wizardSidepanel.step3.scoring')"
						/>
					</li>
				</ul>

				<ul
					v-if="latestRun && !showLoadingState"
					:class="$style.checkList"
					data-test-id="evaluations-wizard-sidepanel-results"
				>
					<li
						v-for="metric in cannedMetrics.filter((m) => selectedMetricKeys.includes(m.key))"
						:key="metric.key"
					>
						<CheckResultCard
							:icon="metric.icon"
							:icon-bg="metric.tileBg"
							:icon-fg="metric.tileFg"
							:title="locale.baseText(metric.labelKey)"
							:description="locale.baseText(metric.descriptionKey)"
							:badge="
								isLlmJudgeMetric(metric.key)
									? locale.baseText('evaluations.wizardSidepanel.metric.judgeTag')
									: undefined
							"
							:category="metric.category"
							:score-label="locale.baseText('evaluations.wizardSidepanel.step3.testLabel')"
							:score-text="
								formatMetricPercent(latestRun.metrics?.[metric.key], {
									category: metric.category,
								})
							"
							:score-percent="metricScorePercent(metric.key)"
							:output-label="locale.baseText('evaluations.wizardSidepanel.step3.output')"
							:output-text="
								latestRunOutputText ||
								locale.baseText('evaluations.wizardSidepanel.step3.outputPlaceholder')
							"
							:output-meta="`${formatTokens(latestRun.metrics?.totalTokens)} · ${formatDuration(latestRun.metrics?.executionTime)}`"
						/>
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

		<CustomCheckModal />
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

.checkList {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.addCard {
	display: grid;
	grid-template-columns: auto 1fr;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	color: var(--color--text--tint-1);
	cursor: pointer;
	outline: none;
	transition: border-color var(--duration--snappy) ease;

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
	}
}

.addCardIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 6px;
	background-color: var(--background--subtle);
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
