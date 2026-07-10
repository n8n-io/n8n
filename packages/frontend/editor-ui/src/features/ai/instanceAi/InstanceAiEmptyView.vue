<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useResizeObserver } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useChatInputAutoFocus } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import {
	INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT,
	INSTANCE_AI_TEMPLATE_EXAMPLES_EXPERIMENT,
} from '@/app/constants/experiments';
import { INSTANCE_AI_TEMPLATE_EXAMPLES_EXPOSURE_EVENT } from '@/experiments/instanceAiTemplateExamples/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { INSTANCE_AI_THREAD_VIEW } from './constants';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS } from './emptyStateSuggestions';
import { useCreditWarningBanner } from './composables/useCreditWarningBanner';
import {
	InstanceAiProactiveStarterMessage,
	useInstanceAiProactiveAgentExperiment,
} from '@/experiments/instanceAiProactiveAgent';
import {
	InstanceAiPromptSuggestionsV2,
	INSTANCE_AI_PROMPT_SUGGESTIONS_V2,
	INSTANCE_AI_PROMPT_SUGGESTIONS_V2_VERSION,
	useInstanceAiPromptSuggestionsV2Experiment,
} from '@/experiments/instanceAiPromptSuggestionsV2';
import {
	InstanceAiPersonalizedPromptSuggestions,
	INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_VERSION,
	getTopUsedV2FallbackSuggestions,
	resolvePersonalizedPromptSuggestions,
	usePersonalizedPromptProfileOverride,
	useInstanceAiPersonalizedPromptSuggestionsExperiment,
	type PersonalizedPromptMetadataLoadState,
	type PersonalizedPromptSuggestionResolution,
} from '@/experiments/instanceAiPersonalizedPromptSuggestions';
import {
	WorkflowPreviewSuggestions,
	WorkflowPreviewCanvas,
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS,
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_VERSION,
	getPreviewWorkflow,
	useInstanceAiWorkflowPreviewSuggestionsExperiment,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions';
import {
	InstanceAiSplitEmptyState,
	INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION,
	useInstanceAiSplitEmptyStateExperiment,
} from '@/experiments/instanceAiSplitEmptyState';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import WorkflowBuilderUnavailableNotice from './components/WorkflowBuilderUnavailableNotice.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import ProjectSelect from './components/ProjectSelect.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	useInstanceAiTemplateExamplesExperiment,
	useInstanceAiTemplateExamplesStore,
	TemplateExamplesCatalog,
	TEMPLATE_PROMPT_SUFFIX,
} from '@/experiments/instanceAiTemplateExamples';

const INSTANCE_AI_DEFAULT_TITLE_KEY: BaseTextKey = 'instanceAi.emptyState.title';
// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const INSTANCE_AI_PROMPT_SUGGESTIONS_V2_TITLE_KEY: BaseTextKey =
	'experiments.instanceAiPromptSuggestionsV2.emptyState.title';
const INSTANCE_AI_PROMPT_SUGGESTIONS_V2_PLACEHOLDER_KEY: BaseTextKey =
	'experiments.instanceAiPromptSuggestionsV2.input.placeholder';
const INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_TITLE_KEY =
	'experiments.instanceAiWorkflowPreviewSuggestions.emptyState.title' as BaseTextKey;
const INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_PLACEHOLDER_KEY =
	'experiments.instanceAiWorkflowPreviewSuggestions.input.placeholder' as BaseTextKey;
const INSTANCE_AI_SPLIT_EMPTY_STATE_PLACEHOLDER_KEY: BaseTextKey =
	'experiments.instanceAiSplitEmptyState.input.placeholder';
const INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_PLACEHOLDER_KEY: BaseTextKey =
	'experiments.instanceAiPersonalizedPromptSuggestions.input.placeholder';
// Experiment cleanup: remove with instanceAiSplitEmptyState. The split layout
// locks the composer to a constant height so hovering an example only swaps
// the placeholder text — the examples list below it never shifts.
const INSTANCE_AI_SPLIT_FIXED_ROWS = 5;
const PERSONALIZED_PROMPT_METADATA_TIMEOUT_MS = 2000;
const INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPOSURE_EVENT =
	'Instance AI personalized prompt suggestions exposed';

const store = useInstanceAiStore();
const appSettingsStore = useSettingsStore();
const cloudPlanStore = useCloudPlanStore();
const projectsStore = useProjectsStore();
const selectedProject = ref(projectsStore.personalProject?.id);
const settingsStore = useInstanceAiSettingsStore();
const { isLowCredits } = storeToRefs(store);
const rootStore = useRootStore();
const router = useRouter();
const toast = useToast();
const telemetry = useTelemetry();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(isLowCredits);
const { isFeatureEnabled: isProactiveAgentExperimentEnabled } =
	useInstanceAiProactiveAgentExperiment();
const { isFeatureEnabled: isPromptSuggestionsV2ExperimentEnabled } =
	useInstanceAiPromptSuggestionsV2Experiment();
const { isFeatureEnabled: isWorkflowPreviewSuggestionsExperimentEnabled } =
	useInstanceAiWorkflowPreviewSuggestionsExperiment();
const {
	isFeatureEnabled: isTemplateExamplesExperimentEnabled,
	currentVariant: templateExamplesVariant,
} = useInstanceAiTemplateExamplesExperiment();
const templateExamplesStore = useInstanceAiTemplateExamplesStore();
const showTemplateExamples = computed(
	() => isTemplateExamplesExperimentEnabled.value && !templateExamplesStore.hasLoadFailed,
);
let hasTrackedTemplateExamplesExposure = false;
watch(
	showTemplateExamples,
	(visible) => {
		const variant = templateExamplesVariant.value;
		if (!visible || hasTrackedTemplateExamplesExposure || typeof variant !== 'string') {
			return;
		}

		telemetry.track(
			INSTANCE_AI_TEMPLATE_EXAMPLES_EXPOSURE_EVENT,
			getExperimentTelemetryPayload(INSTANCE_AI_TEMPLATE_EXAMPLES_EXPERIMENT, variant),
		);
		hasTrackedTemplateExamplesExposure = true;
	},
	{ immediate: true },
);
const { isVariantEnabled: isSplitVariantEnabled } = useInstanceAiSplitEmptyStateExperiment();
// Experiment cleanup: remove with instanceAiSplitEmptyState.
const splitPreviewPromptKey = ref<BaseTextKey | null>(null);
const splitWriting = ref(false);
const {
	currentVariant: personalizedPromptSuggestionsVariant,
	isTreatmentVariant: isPersonalizedPromptSuggestionsTreatmentVariant,
	suggestionFormat: personalizedPromptSuggestionsFormat,
} = useInstanceAiPersonalizedPromptSuggestionsExperiment();
const showProactiveStarter = computed(() => isProactiveAgentExperimentEnabled.value);
// Experiment cleanup: remove with instanceAiSplitEmptyState. The split layout
// hosts the view header inside its chat column; the proactive starter (082)
// keeps precedence.
const isSplitLayoutActive = computed(
	() => isSplitVariantEnabled.value && !showProactiveStarter.value,
);
const shouldTrackPersonalizedPromptSuggestionsExposure = computed(
	() =>
		typeof personalizedPromptSuggestionsVariant.value === 'string' &&
		!showProactiveStarter.value &&
		!isSplitLayoutActive.value &&
		settingsStore.isWorkflowBuilderAvailable,
);
const activeWorkflowPreviewFile = ref<string | null>(null);
const activeWorkflowPreview = computed(() => {
	if (!activeWorkflowPreviewFile.value) return null;
	return getPreviewWorkflow(activeWorkflowPreviewFile.value) ?? null;
});
const personalizedPromptSuggestionResolution = ref<PersonalizedPromptSuggestionResolution | null>(
	null,
);
const personalizedPromptProfileOverride = usePersonalizedPromptProfileOverride();
let personalizedPromptMetadataTimeout: ReturnType<typeof setTimeout> | null = null;
let hasTrackedPersonalizedPromptSuggestionsExposure = false;

const personalizedPromptFallbackSuggestions = computed(() =>
	getTopUsedV2FallbackSuggestions((key) => i18n.baseText(key)),
);

function clearPersonalizedPromptMetadataTimeout() {
	if (!personalizedPromptMetadataTimeout) {
		return;
	}

	clearTimeout(personalizedPromptMetadataTimeout);
	personalizedPromptMetadataTimeout = null;
}

function setPersonalizedPromptResolution(metadataLoadState: PersonalizedPromptMetadataLoadState) {
	const format = personalizedPromptSuggestionsFormat.value;
	if (!format) {
		personalizedPromptSuggestionResolution.value = null;
		return;
	}

	personalizedPromptSuggestionResolution.value = resolvePersonalizedPromptSuggestions({
		metadata: personalizedPromptProfileOverride.value
			? null
			: (cloudPlanStore.currentUserCloudInfo?.information ?? null),
		metadataLoadState: personalizedPromptProfileOverride.value ? 'loaded' : metadataLoadState,
		format,
		profileOverride: personalizedPromptProfileOverride.value,
		fallbackSuggestions: personalizedPromptFallbackSuggestions.value,
	});
}

function resolvePersonalizedPromptMetadata() {
	clearPersonalizedPromptMetadataTimeout();
	personalizedPromptSuggestionResolution.value = null;

	if (!isPersonalizedPromptSuggestionsTreatmentVariant.value) {
		return;
	}

	if (personalizedPromptProfileOverride.value) {
		setPersonalizedPromptResolution('loaded');
		return;
	}

	if (!appSettingsStore.isCloudDeployment) {
		setPersonalizedPromptResolution('not_cloud');
		return;
	}

	if (cloudPlanStore.state.initialized) {
		setPersonalizedPromptResolution(cloudPlanStore.currentUserCloudInfo ? 'loaded' : 'failed');
		return;
	}

	personalizedPromptMetadataTimeout = setTimeout(() => {
		personalizedPromptMetadataTimeout = null;
		setPersonalizedPromptResolution('timed_out');
	}, PERSONALIZED_PROMPT_METADATA_TIMEOUT_MS);
}

watch(
	[
		isPersonalizedPromptSuggestionsTreatmentVariant,
		personalizedPromptSuggestionsFormat,
		personalizedPromptProfileOverride,
		() => appSettingsStore.isCloudDeployment,
	],
	resolvePersonalizedPromptMetadata,
	{ immediate: true },
);

watch(
	shouldTrackPersonalizedPromptSuggestionsExposure,
	(shouldTrackExposure) => {
		const variant = personalizedPromptSuggestionsVariant.value;
		if (
			!shouldTrackExposure ||
			hasTrackedPersonalizedPromptSuggestionsExposure ||
			typeof variant !== 'string'
		) {
			return;
		}

		telemetry.track(
			INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPOSURE_EVENT,
			getExperimentTelemetryPayload(
				INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT,
				variant,
			),
		);
		hasTrackedPersonalizedPromptSuggestionsExposure = true;
	},
	{ immediate: true },
);

watch(
	[() => cloudPlanStore.state.initialized, () => cloudPlanStore.currentUserCloudInfo],
	([initialized]) => {
		if (
			!isPersonalizedPromptSuggestionsTreatmentVariant.value ||
			personalizedPromptSuggestionResolution.value !== null ||
			!initialized
		) {
			return;
		}

		clearPersonalizedPromptMetadataTimeout();
		setPersonalizedPromptResolution(cloudPlanStore.currentUserCloudInfo ? 'loaded' : 'failed');
	},
);

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const emptyStatePromptSuggestionProps = computed(() => {
	if (showProactiveStarter.value) {
		return {};
	}

	if (showTemplateExamples.value) {
		return {};
	}
	if (isPersonalizedPromptSuggestionsTreatmentVariant.value) {
		const resolution = personalizedPromptSuggestionResolution.value;

		if (!resolution) {
			return {
				suggestions: [],
				placeholderKey: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_PLACEHOLDER_KEY,
			};
		}

		return {
			suggestions: resolution.suggestions,
			suggestionsComponent: InstanceAiPersonalizedPromptSuggestions,
			suggestionsComponentProps: {
				fallbackSuggestions: resolution.fallbackSuggestions,
				format: personalizedPromptSuggestionsFormat.value,
				showSeeMore: resolution.showSeeMore,
			},
			suggestionCatalogVersion: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_VERSION,
			suggestionTelemetryPayload: getExperimentTelemetryPayload(
				INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT,
				personalizedPromptSuggestionsVariant.value,
				resolution.telemetryPayload,
			),
			placeholderKey: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_PLACEHOLDER_KEY,
		};
	}

	if (isPromptSuggestionsV2ExperimentEnabled.value) {
		return {
			suggestions: INSTANCE_AI_PROMPT_SUGGESTIONS_V2,
			suggestionsComponent: InstanceAiPromptSuggestionsV2,
			suggestionCatalogVersion: INSTANCE_AI_PROMPT_SUGGESTIONS_V2_VERSION,
			placeholderKey: INSTANCE_AI_PROMPT_SUGGESTIONS_V2_PLACEHOLDER_KEY,
		};
	}

	if (isWorkflowPreviewSuggestionsExperimentEnabled.value) {
		return {
			suggestions: INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS,
			suggestionsComponent: WorkflowPreviewSuggestions,
			suggestionCatalogVersion: INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_VERSION,
			placeholderKey: INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_PLACEHOLDER_KEY,
		};
	}

	return {
		suggestions: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS,
	};
});
// Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment
const INSTANCE_AI_TEMPLATE_EXAMPLES_TITLE_KEY =
	'experiments.instanceAiTemplateExamples.emptyState.title' as BaseTextKey;
const INSTANCE_AI_TEMPLATE_EXAMPLES_PLACEHOLDER_KEY =
	'experiments.instanceAiTemplateExamples.input.placeholder' as BaseTextKey;

const emptyStateTitleKey = computed<BaseTextKey>(() => {
	if (showTemplateExamples.value) {
		return INSTANCE_AI_TEMPLATE_EXAMPLES_TITLE_KEY;
	}
	if (isPersonalizedPromptSuggestionsTreatmentVariant.value) {
		return INSTANCE_AI_PROMPT_SUGGESTIONS_V2_TITLE_KEY;
	}
	if (isPromptSuggestionsV2ExperimentEnabled.value) {
		return INSTANCE_AI_PROMPT_SUGGESTIONS_V2_TITLE_KEY;
	}
	if (isWorkflowPreviewSuggestionsExperimentEnabled.value) {
		return INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_TITLE_KEY;
	}
	return INSTANCE_AI_DEFAULT_TITLE_KEY;
});

const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);
const isStartingThread = ref(false);

// Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment
const templatePreviewPrompt = ref<string | null>(null);

function handleTemplateHoverPrompt(prompt: string) {
	templatePreviewPrompt.value = prompt;
}

function handleTemplateHoverEnd() {
	templatePreviewPrompt.value = null;
}

const inputPulsing = ref(false);
const selectedTemplatePrompt = ref<string | null>(null);

function handleTemplateSelectPrompt(prompt: string) {
	templatePreviewPrompt.value = null;
	if (chatInputRef.value) {
		chatInputRef.value.setText(prompt);
		chatInputRef.value.focus();
	}
	selectedTemplatePrompt.value = prompt;
	inputPulsing.value = true;
	setTimeout(() => {
		inputPulsing.value = false;
	}, 250);
}
// EOF InstanceAiTemplateExamplesExperiment experiment cleanup
const emptyLayoutRef = useTemplateRef<HTMLElement>('emptyLayout');
const centeredInputRef = useTemplateRef<HTMLElement>('centeredInput');
const CANVAS_NATURAL_HEIGHT_PX = 420;
const PREVIEW_MIN_SCALE = 0.3;

const previewScale = ref(1);

useResizeObserver(emptyLayoutRef, () => {
	if (!emptyLayoutRef.value || !centeredInputRef.value) return;
	const containerRect = emptyLayoutRef.value.getBoundingClientRect();
	const inputRect = centeredInputRef.value.getBoundingClientRect();
	const layoutStyles = getComputedStyle(emptyLayoutRef.value);
	const bottomPadding = parseFloat(layoutStyles.paddingBottom);
	const gap = parseFloat(layoutStyles.gap) || 0;
	const remainingSpace = containerRect.bottom - inputRect.bottom - bottomPadding - gap;
	previewScale.value = Math.max(0, Math.min(1, remainingSpace / CANVAS_NATURAL_HEIGHT_PX));
});

const hasSpaceForPreview = computed(() => previewScale.value >= PREVIEW_MIN_SCALE);

const workflowPreviewWrapperStyle = computed(() => ({
	transform: `scale(${previewScale.value})`,
	transformOrigin: 'top center',
	height: `${CANVAS_NATURAL_HEIGHT_PX * previewScale.value}px`,
}));

useChatInputAutoFocus(chatInputRef, { disabled: isStartingThread });
function handleWorkflowPreview(workflowFile: string | null) {
	activeWorkflowPreviewFile.value = workflowFile;
}

onMounted(() => {
	void nextTick(() => chatInputRef.value?.focus());
});

onUnmounted(clearPersonalizedPromptMetadataTimeout);

async function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	if (!settingsStore.isWorkflowBuilderAvailable) {
		return;
	}

	if (!selectedProject.value) {
		toast.showError(new Error('Please select a project before starting a thread.'), 'Send failed');
		return;
	}

	// Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment
	const isFromTemplate =
		isTemplateExamplesExperimentEnabled.value &&
		selectedTemplatePrompt.value !== null &&
		message.startsWith(selectedTemplatePrompt.value);
	const finalMessage = isFromTemplate ? message + TEMPLATE_PROMPT_SUFFIX : message;

	const threadId = uuidv4();
	isStartingThread.value = true;

	// Persist the thread on the BE first. Otherwise we'd navigate to
	// `/assistant/:threadId` for a thread the BE doesn't know about, and the
	// follow-up `postMessage` would 404.
	try {
		await store.syncThread(threadId, selectedProject.value);
	} catch {
		isStartingThread.value = false;
		toast.showError(new Error('Failed to start a new thread. Try again.'), 'Send failed');
		return;
	}

	const thread = store.getOrCreateRuntime(threadId, selectedProject.value);
	void thread.sendMessage(finalMessage, attachments, rootStore.pushRef);
	void router.replace({
		name: INSTANCE_AI_THREAD_VIEW,
		params: { threadId },
	});
}

function handleShelfSuggestionSubmit(payload: {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
}) {
	void chatInputRef.value?.submitSuggestion(payload);
}

function handleShelfSuggestionInsert(payload: {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
}) {
	splitPreviewPromptKey.value = null;
	void chatInputRef.value?.insertSuggestion(payload);
}
</script>

<template>
	<div :class="$style.chatArea">
		<InstanceAiViewHeader v-if="!isSplitLayoutActive" />

		<div :class="$style.contentArea">
			<div v-if="showProactiveStarter" :class="$style.proactiveLayout">
				<div :class="$style.proactiveMessageList">
					<InstanceAiProactiveStarterMessage />
				</div>
				<div :class="$style.proactiveInput">
					<CreditWarningBanner
						v-if="creditBanner.visible.value"
						variant="standalone"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
						@dismiss="creditBanner.dismiss()"
					/>
					<WorkflowBuilderUnavailableNotice v-if="!settingsStore.isWorkflowBuilderAvailable" />
					<InstanceAiInput
						ref="chatInputRef"
						:is-submitting="isStartingThread"
						:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
						@submit="handleSubmit"
					>
						<template #footer v-if="projectsStore.myProjects.length > 1">
							<div :class="$style.inputFooter">
								<ProjectSelect v-model="selectedProject" />
							</div>
						</template>
					</InstanceAiInput>
				</div>
			</div>
			<InstanceAiSplitEmptyState
				v-else-if="isSplitVariantEnabled"
				:project-id="selectedProject"
				:disabled="isStartingThread || !settingsStore.isWorkflowBuilderAvailable"
				:writing="splitWriting"
				@submit-suggestion="handleShelfSuggestionSubmit"
				@insert-suggestion="handleShelfSuggestionInsert"
				@example-change="(_i, key) => (splitPreviewPromptKey = key)"
			>
				<template #header>
					<InstanceAiViewHeader />
				</template>
				<template #input>
					<div :class="$style.centeredInput">
						<CreditWarningBanner
							v-if="creditBanner.visible.value"
							:credits-remaining="store.creditsRemaining"
							:credits-quota="store.creditsQuota"
							@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
							@dismiss="creditBanner.dismiss()"
						/>
						<WorkflowBuilderUnavailableNotice v-if="!settingsStore.isWorkflowBuilderAvailable" />
						<InstanceAiInput
							ref="chatInputRef"
							:is-submitting="isStartingThread"
							:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
							:placeholder-key="INSTANCE_AI_SPLIT_EMPTY_STATE_PLACEHOLDER_KEY"
							:preview-prompt-key="splitWriting ? null : splitPreviewPromptKey"
							:fixed-rows="INSTANCE_AI_SPLIT_FIXED_ROWS"
							:submit-label="i18n.baseText('experiments.instanceAiSplitEmptyState.cta.buildWithAi')"
							:submit-active-requires-focus="true"
							:suggestion-catalog-version="INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION"
							@submit="handleSubmit"
							@content-change="splitWriting = $event"
						>
							<template v-if="projectsStore.myProjects.length > 1" #footer>
								<div :class="$style.inputFooter" data-test-id="instance-ai-split-project-select">
									<ProjectSelect v-model="selectedProject" />
								</div>
							</template>
						</InstanceAiInput>
					</div>
				</template>
			</InstanceAiSplitEmptyState>
			<div v-else ref="emptyLayout" :class="$style.emptyLayout">
				<InstanceAiEmptyState :title-key="emptyStateTitleKey" :show-title-icon="true" />
				<div ref="centeredInput" :class="[$style.centeredInput, inputPulsing && $style.inputPulse]">
					<CreditWarningBanner
						v-if="creditBanner.visible.value"
						variant="standalone"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
						@dismiss="creditBanner.dismiss()"
					/>
					<WorkflowBuilderUnavailableNotice v-if="!settingsStore.isWorkflowBuilderAvailable" />
					<InstanceAiInput
						ref="chatInputRef"
						:is-submitting="isStartingThread"
						:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
						:contextual-suggestion="templatePreviewPrompt"
						:placeholder-key="
							showTemplateExamples ? INSTANCE_AI_TEMPLATE_EXAMPLES_PLACEHOLDER_KEY : undefined
						"
						:bold-placeholder="showTemplateExamples"
						v-bind="emptyStatePromptSuggestionProps"
						@submit="handleSubmit"
						@workflow-preview="handleWorkflowPreview"
					>
						<template #footer v-if="projectsStore.myProjects.length > 1">
							<div :class="$style.inputFooter">
								<ProjectSelect v-model="selectedProject" />
							</div>
						</template>
					</InstanceAiInput>
				</div>
				<!-- Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment -->
				<TemplateExamplesCatalog
					v-if="showTemplateExamples"
					:class="$style.templateCatalog"
					@hover-prompt="handleTemplateHoverPrompt"
					@hover-end="handleTemplateHoverEnd"
					@select-prompt="handleTemplateSelectPrompt"
				/>
				<Transition name="workflow-preview-fade">
					<div
						v-if="
							isWorkflowPreviewSuggestionsExperimentEnabled &&
							activeWorkflowPreview &&
							hasSpaceForPreview
						"
						:class="$style.workflowPreviewWrapper"
						:style="workflowPreviewWrapperStyle"
					>
						<WorkflowPreviewCanvas
							:workflow="activeWorkflowPreview"
							:class="$style.workflowPreview"
						/>
					</div>
				</Transition>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.inputFooter {
	padding-top: calc(var(--spacing--2xs) + var(--radius--xl));
	padding-bottom: var(--spacing--2xs);
	padding-left: var(--spacing--2xs);
	padding-right: var(--spacing--2xs);

	margin-top: calc(-1 * var(--radius--xl));
	background-color: light-dark(var(--color--neutral-150), var(--color--neutral-800));
	border-bottom-left-radius: var(--radius--xl);
	border-bottom-right-radius: var(--radius--xl);
	display: flex;
	flex-direction: row;
}

.chatArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	position: relative;
	background-color: var(--color--background--light-2);
}

.contentArea {
	display: flex;
	flex: 1;
	min-height: 0;
	position: relative;
}

.emptyLayout {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
	padding-top: 20vh;
	overflow: hidden;
}

.centeredInput {
	width: 100%;
	max-width: 680px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.inputPulse {
	animation: inputScaleUp 0.25s ease;
}

@keyframes inputScaleUp {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.02);
	}
	100% {
		transform: scale(1);
	}
}

.templateCatalog {
	width: 100%;
	max-width: 1014px;
	min-width: 0;
	margin-top: var(--spacing--m);
}

.workflowPreviewWrapper {
	width: 100%;
	max-width: 1600px;
	transition:
		transform 0.2s ease,
		height 0.2s ease;
}

.workflowPreview {
	width: 100%;
	max-width: 1600px;
}

.proactiveLayout {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.proactiveMessageList {
	flex: 1;
	width: 100%;
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}

.proactiveInput {
	width: 100%;
	max-width: 750px;
	margin: 0 auto;
	padding: 0 var(--spacing--lg) var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

:global(.workflow-preview-fade-enter-active) {
	transition:
		opacity 0.08s ease-out,
		transform 0.08s ease-out;
}

:global(.workflow-preview-fade-leave-active) {
	transition:
		opacity 0.18s ease,
		transform 0.18s ease;
}

:global(.workflow-preview-fade-enter-from) {
	opacity: 0;
	transform: translateY(8px);
}

:global(.workflow-preview-fade-leave-to) {
	opacity: 0;
	transform: translateY(4px);
}
</style>
