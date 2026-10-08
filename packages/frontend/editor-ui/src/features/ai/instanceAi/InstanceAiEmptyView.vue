<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useResizeObserver } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import type {
	InstanceAiAttachment,
	InstanceAiResourceAttachment,
	InstanceAiThreadSource,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useChatInputAutoFocus } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { countAttachedNodes } from './utils/buildNodesAttachment';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import {
	INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT,
	INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT,
} from '@/app/constants/experiments';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useInstanceAiStore } from './instanceAi.store';
import type { InstanceAiMessageAuthorship, InstanceAiPrefillDeclaration } from './prefills';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { useNewChatProject } from './experience/useNewChatProject';
import { useRunTargetPicker } from './runTarget/useRunTargetPicker';
import { optionalRunTarget } from './runTarget/runTargetOptions';
import {
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_SOURCE_QUERY,
	isInstanceAiThreadSource,
} from './constants';
import {
	stashPendingFirstMessage,
	stashPendingFirstMessageFiles,
} from './composables/useInstanceAiHandoff';
import { fileAttachmentToFile } from './utils/fileAttachments';
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
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION,
	isPersonalizedPromptSuggestionResolution,
	isTaxonomyPromptSuggestionResolution,
	resolveTaxonomyPromptSuggestions,
	resolveTaxonomySegment,
	useInstanceAiInspirationFromTaxonomyExperiment,
	type TaxonomyPromptSuggestionResolution,
} from '@/experiments/instanceAiInspirationFromTaxonomy';
import {
	WorkflowPreviewSuggestions,
	WorkflowPreviewCanvas,
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS,
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_VERSION,
	getPreviewWorkflow,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions';
import {
	InstanceAiSplitEmptyState,
	INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION,
	useInstanceAiSplitEmptyStateExperiment,
} from '@/experiments/instanceAiSplitEmptyState';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import DitherTrailGrid from './components/DitherTrailGrid.vue';
import WorkflowBuilderUnavailableNotice from './components/WorkflowBuilderUnavailableNotice.vue';
import LimitedModeNotice from './components/LimitedModeNotice.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import ProjectSelect from './components/ProjectSelect.vue';
import RunTargetPicker from './runTarget/RunTargetPicker.vue';
import { useIsAssistantAtMentionsEnabled } from '@/features/ai/assistant-at-mentions/composables/useIsAssistantAtMentionsEnabled';
import {
	EMPTY_ASSISTANT_MENTION_COUNTS,
	type AssistantMentionCounts,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import { InstanceAiFreeNudge } from '@/experiments/instanceAiFreeNudge';

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
const INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPOSURE_EVENT =
	'Instance AI inspiration from taxonomy exposed';

const store = useInstanceAiStore();
const appSettingsStore = useSettingsStore();
const cloudPlanStore = useCloudPlanStore();
const route = useRoute();
const router = useRouter();
const { selectedProject, canSelectProject, rememberChatProject } = useNewChatProject();
const { showRunTargetPicker, runTarget, links, chosenRunTarget } = useRunTargetPicker();

/** Prefer a hand-off source from navigation; fall back for direct empty-state visits. */
function resolveLaunchSource(): InstanceAiThreadSource {
	const querySource = route.query[INSTANCE_AI_SOURCE_QUERY];
	return isInstanceAiThreadSource(querySource) ? querySource : 'assistant_page';
}

const settingsStore = useInstanceAiSettingsStore();
const { showCreditWarning, quotaLocked } = storeToRefs(store);
const toast = useToast();
const telemetry = useTelemetry();
const i18n = useI18n();
const mentionsEnabled = useIsAssistantAtMentionsEnabled();
// Opening a new conversation drops the tab title of the thread we came from —
// this view mounts on every entry to the empty route, the parent layout doesn't.
useDocumentTitle().set(i18n.baseText('instanceAi.view.title'));
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(showCreditWarning);
const { isFeatureEnabled: isProactiveAgentExperimentEnabled } =
	useInstanceAiProactiveAgentExperiment();
const { isFeatureEnabled: isPromptSuggestionsV2ExperimentEnabled } =
	useInstanceAiPromptSuggestionsV2Experiment();
const { isVariantEnabled: isSplitVariantEnabled } = useInstanceAiSplitEmptyStateExperiment();
// Experiment cleanup: remove with instanceAiSplitEmptyState.
const splitPreviewPromptKey = ref<BaseTextKey | null>(null);
const composerHasContent = ref(false);
const {
	currentVariant: personalizedPromptSuggestionsVariant,
	isTreatmentVariant: isPersonalizedPromptSuggestionsTreatmentVariant,
	suggestionFormat: personalizedPromptSuggestionsFormat,
} = useInstanceAiPersonalizedPromptSuggestionsExperiment();
const {
	currentVariant: inspirationFromTaxonomyVariant,
	isTreatmentVariant: isInspirationFromTaxonomyTreatmentVariant,
} = useInstanceAiInspirationFromTaxonomyExperiment();
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
const personalizedPromptSuggestionResolution = ref<
	PersonalizedPromptSuggestionResolution | TaxonomyPromptSuggestionResolution | null
>(null);
const shouldShowTaxonomySuggestions = computed(() =>
	isTaxonomyPromptSuggestionResolution(personalizedPromptSuggestionResolution.value),
);
const isTaxonomySegmentResolved = computed(
	() =>
		appSettingsStore.isCloudDeployment &&
		cloudPlanStore.state.initialized &&
		resolveTaxonomySegment(cloudPlanStore.currentUserCloudInfo?.information ?? null).source ===
			'taxonomy',
);
const shouldTrackInspirationFromTaxonomyExposure = computed(() => {
	if (showProactiveStarter.value || isSplitLayoutActive.value) {
		return false;
	}

	if (!settingsStore.isWorkflowBuilderAvailable) {
		return false;
	}

	if (
		inspirationFromTaxonomyVariant.value ===
		INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.control
	) {
		return isTaxonomySegmentResolved.value;
	}

	return shouldShowTaxonomySuggestions.value;
});
const activeWorkflowPreviewFile = ref<string | null>(null);
const activeWorkflowPreview = computed(() => {
	if (!activeWorkflowPreviewFile.value) return null;
	return getPreviewWorkflow(activeWorkflowPreviewFile.value) ?? null;
});
const personalizedPromptProfileOverride = usePersonalizedPromptProfileOverride();
let personalizedPromptMetadataTimeout: ReturnType<typeof setTimeout> | null = null;
let hasTrackedPersonalizedPromptSuggestionsExposure = false;
let hasTrackedInspirationFromTaxonomyExposure = false;
const isAnyPersonalizedSuggestionsTreatmentActive = computed(
	() =>
		isInspirationFromTaxonomyTreatmentVariant.value ||
		isPersonalizedPromptSuggestionsTreatmentVariant.value,
);

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
	if (isInspirationFromTaxonomyTreatmentVariant.value) {
		const taxonomyResolution = resolveTaxonomyPromptSuggestions({
			metadata: cloudPlanStore.currentUserCloudInfo?.information ?? null,
			metadataLoadState,
		});

		if (taxonomyResolution.source === 'taxonomy') {
			personalizedPromptSuggestionResolution.value = taxonomyResolution;
			return;
		}

		if (!isPersonalizedPromptSuggestionsTreatmentVariant.value) {
			personalizedPromptSuggestionResolution.value = taxonomyResolution;
			return;
		}
	}

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

	if (!isAnyPersonalizedSuggestionsTreatmentActive.value) {
		return;
	}

	if (!isInspirationFromTaxonomyTreatmentVariant.value && personalizedPromptProfileOverride.value) {
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
		isInspirationFromTaxonomyTreatmentVariant,
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
	shouldTrackInspirationFromTaxonomyExposure,
	(shouldTrackExposure) => {
		const variant = inspirationFromTaxonomyVariant.value;
		if (
			!shouldTrackExposure ||
			hasTrackedInspirationFromTaxonomyExposure ||
			typeof variant !== 'string'
		) {
			return;
		}

		telemetry.track(
			INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPOSURE_EVENT,
			getExperimentTelemetryPayload(INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT, variant),
		);
		hasTrackedInspirationFromTaxonomyExposure = true;
	},
	{ immediate: true },
);

watch(
	[() => cloudPlanStore.state.initialized, () => cloudPlanStore.currentUserCloudInfo],
	([initialized]) => {
		if (
			!isAnyPersonalizedSuggestionsTreatmentActive.value ||
			personalizedPromptSuggestionResolution.value !== null ||
			!initialized
		) {
			return;
		}

		clearPersonalizedPromptMetadataTimeout();
		setPersonalizedPromptResolution(cloudPlanStore.currentUserCloudInfo ? 'loaded' : 'failed');
	},
);

const isTaxonomySuggestionsPending = computed(
	() =>
		isInspirationFromTaxonomyTreatmentVariant.value &&
		personalizedPromptSuggestionResolution.value === null,
);
const shouldShowPersonalizedPromptSuggestions = computed(() =>
	isPersonalizedPromptSuggestionResolution(personalizedPromptSuggestionResolution.value),
);

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const emptyStatePromptSuggestionProps = computed(() => {
	if (showProactiveStarter.value) {
		return {};
	}

	if (isTaxonomySuggestionsPending.value) {
		return {
			suggestions: [],
			placeholderKey: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_PLACEHOLDER_KEY,
		};
	}

	const resolution = personalizedPromptSuggestionResolution.value;
	if (isTaxonomyPromptSuggestionResolution(resolution)) {
		return {
			suggestions: resolution.suggestions,
			suggestionsComponent: InstanceAiPersonalizedPromptSuggestions,
			suggestionsComponentProps: {
				fallbackSuggestions: [],
				format: 'list',
				showSeeMore: resolution.showSeeMore,
			},
			suggestionCatalogVersion: INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION,
			suggestionTelemetryPayload: getExperimentTelemetryPayload(
				INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT,
				inspirationFromTaxonomyVariant.value,
				resolution.telemetryPayload,
			),
			placeholderKey: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_PLACEHOLDER_KEY,
		};
	}

	if (isPersonalizedPromptSuggestionsTreatmentVariant.value) {
		if (!resolution) {
			return {
				suggestions: [],
				placeholderKey: INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_PLACEHOLDER_KEY,
			};
		}

		if (isPersonalizedPromptSuggestionResolution(resolution)) {
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
	}

	if (isPromptSuggestionsV2ExperimentEnabled.value) {
		return {
			suggestions: INSTANCE_AI_PROMPT_SUGGESTIONS_V2,
			suggestionsComponent: InstanceAiPromptSuggestionsV2,
			suggestionCatalogVersion: INSTANCE_AI_PROMPT_SUGGESTIONS_V2_VERSION,
			placeholderKey: INSTANCE_AI_PROMPT_SUGGESTIONS_V2_PLACEHOLDER_KEY,
		};
	}

	return {
		suggestions: INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS,
		suggestionsComponent: WorkflowPreviewSuggestions,
		suggestionCatalogVersion: INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_VERSION,
		placeholderKey: INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_PLACEHOLDER_KEY,
	};
});
const emptyStateTitleKey = computed<BaseTextKey>(() => {
	if (
		shouldShowTaxonomySuggestions.value ||
		isTaxonomySuggestionsPending.value ||
		shouldShowPersonalizedPromptSuggestions.value ||
		(isPersonalizedPromptSuggestionsTreatmentVariant.value &&
			personalizedPromptSuggestionResolution.value === null)
	) {
		return INSTANCE_AI_PROMPT_SUGGESTIONS_V2_TITLE_KEY;
	}
	if (isPromptSuggestionsV2ExperimentEnabled.value) {
		return INSTANCE_AI_PROMPT_SUGGESTIONS_V2_TITLE_KEY;
	}
	return INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_TITLE_KEY;
});

const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);
// Layout changes mount a new, empty composer.
watch(chatInputRef, () => {
	composerHasContent.value = false;
});
const isStartingThread = ref(false);

type ShelfSuggestionPayload = InstanceAiPrefillDeclaration & {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
};

const emptyLayoutRef = useTemplateRef<HTMLElement>('emptyLayout');
const centeredInputRef = useTemplateRef<HTMLElement>('centeredInput');
const CANVAS_NATURAL_HEIGHT_PX = 420;
const PREVIEW_MIN_SCALE = 0.3;

const previewScale = ref(1);
const previewRemainingSpace = ref(CANVAS_NATURAL_HEIGHT_PX);

function updatePreviewScale() {
	if (!emptyLayoutRef.value || !centeredInputRef.value) return;
	const containerRect = emptyLayoutRef.value.getBoundingClientRect();
	const inputRect = centeredInputRef.value.getBoundingClientRect();
	const layoutStyles = getComputedStyle(emptyLayoutRef.value);
	const bottomPadding = parseFloat(layoutStyles.paddingBottom);
	const gap = parseFloat(layoutStyles.gap) || 0;
	const remainingSpace = containerRect.bottom - inputRect.bottom - bottomPadding - gap;
	previewRemainingSpace.value = Math.max(0, remainingSpace);
	previewScale.value = Math.max(0, Math.min(1, remainingSpace / CANVAS_NATURAL_HEIGHT_PX));
}

useResizeObserver(emptyLayoutRef, updatePreviewScale);
useResizeObserver(centeredInputRef, updatePreviewScale);

const hasSpaceForPreview = computed(() => previewScale.value >= PREVIEW_MIN_SCALE);

const workflowPreviewWrapperStyle = computed(() => ({
	transform: `scale(${previewScale.value})`,
	transformOrigin: 'top center',
	height: `${previewRemainingSpace.value}px`,
	'--workflow-preview-canvas-height': `${Math.max(CANVAS_NATURAL_HEIGHT_PX, previewRemainingSpace.value)}px`,
}));

useChatInputAutoFocus(chatInputRef, { disabled: isStartingThread });
function handleWorkflowPreview(workflowFile: string | null) {
	activeWorkflowPreviewFile.value = workflowFile;
}

onMounted(() => {
	void nextTick(() => chatInputRef.value?.focus());
});

onUnmounted(clearPersonalizedPromptMetadataTimeout);

function restoreDraftAfterFailedSubmit(restoreDraft: () => boolean) {
	void nextTick(() => {
		// Puts the text, the attachments and the pre-fill provenance back, and
		// declines if the user has already typed something newer.
		restoreDraft();
		chatInputRef.value?.focus();
	});
}

async function handleSubmit(
	message: string,
	attachments: InstanceAiAttachment[] | undefined,
	restoreDraft: () => boolean,
	authorship: InstanceAiMessageAuthorship,
	responseStartedAtEpochMs?: number,
	acceptDraft: () => void = () => {},
	_mentionCounts: AssistantMentionCounts = EMPTY_ASSISTANT_MENTION_COUNTS,
	_mentionedWorkflowIds: readonly string[] = [],
) {
	if (!settingsStore.isWorkflowBuilderAvailable) {
		return;
	}

	if (!selectedProject.value) {
		restoreDraftAfterFailedSubmit(restoreDraft);
		toast.showError(new Error('Please select a project before starting a thread.'), 'Send failed');
		return;
	}

	const projectId = selectedProject.value;
	const threadId = uuidv4();
	isStartingThread.value = true;

	// Persist the thread on the BE first. Otherwise we'd navigate to
	// `/assistant/:threadId` for a thread the BE doesn't know about, and the
	// follow-up `postMessage` would 404.
	try {
		await store.syncThread(threadId, projectId, {
			source: resolveLaunchSource(),
			origin: 'internal',
		});
	} catch {
		isStartingThread.value = false;
		restoreDraftAfterFailedSubmit(restoreDraft);
		toast.showError(new Error('Failed to start a new thread. Try again.'), 'Send failed');
		return;
	}
	rememberChatProject(projectId);

	// The thread view sends the opener through the Agents chat, so it streams
	// there. Files wait in memory: they are too large for the localStorage stash.
	const references = (attachments ?? []).filter(
		(attachment): attachment is InstanceAiResourceAttachment => attachment.type !== 'file',
	);
	const files = (attachments ?? []).flatMap((attachment) =>
		attachment.type === 'file' ? [fileAttachmentToFile(attachment)] : [],
	);
	stashPendingFirstMessage(threadId, {
		message,
		authorship,
		...(references.length ? { attachments: references } : {}),
		...(responseStartedAtEpochMs !== undefined ? { responseStartedAtEpochMs } : {}),
		...optionalRunTarget(chosenRunTarget.value),
	});
	stashPendingFirstMessageFiles(threadId, files);
	// Track message-with-nodes only after a successful send, so refused sends and
	// retries don't inflate the node-count metric.
	const nodeCount = countAttachedNodes(attachments);
	if (nodeCount > 0) {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
			node_count: nodeCount,
		});
	}
	acceptDraft();

	try {
		await router.replace({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
	} catch (error) {
		toast.showError(error, i18n.baseText('generic.error'));
	} finally {
		isStartingThread.value = false;
	}
}

function handleShelfSuggestionSubmit(payload: ShelfSuggestionPayload) {
	void chatInputRef.value?.submitSuggestion(payload);
}

function handleShelfSuggestionInsert(payload: ShelfSuggestionPayload) {
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
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						:amounts-hidden="quotaLocked"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
						@dismiss="creditBanner.dismiss()"
					/>
					<WorkflowBuilderUnavailableNotice v-if="!settingsStore.isWorkflowBuilderAvailable" />
					<LimitedModeNotice />
					<InstanceAiInput
						ref="chatInputRef"
						:is-submitting="isStartingThread"
						:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
						:mentions-enabled="mentionsEnabled"
						:mention-project-id="selectedProject"
						@submit="handleSubmit"
						@content-change="composerHasContent = $event"
					>
						<template v-if="canSelectProject || showRunTargetPicker" #footer>
							<div :class="$style.inputFooter">
								<ProjectSelect v-if="canSelectProject" v-model="selectedProject" />
								<RunTargetPicker v-if="showRunTargetPicker" v-model="runTarget" :links="links" />
							</div>
						</template>
					</InstanceAiInput>
				</div>
			</div>
			<InstanceAiSplitEmptyState
				v-else-if="isSplitVariantEnabled"
				:project-id="selectedProject"
				:disabled="isStartingThread || !settingsStore.isWorkflowBuilderAvailable"
				:writing="composerHasContent"
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
							:amounts-hidden="quotaLocked"
							@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
							@dismiss="creditBanner.dismiss()"
						/>
						<WorkflowBuilderUnavailableNotice v-if="!settingsStore.isWorkflowBuilderAvailable" />
						<LimitedModeNotice />
						<InstanceAiInput
							ref="chatInputRef"
							:is-submitting="isStartingThread"
							:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
							:mentions-enabled="mentionsEnabled"
							:mention-project-id="selectedProject"
							:placeholder-key="INSTANCE_AI_SPLIT_EMPTY_STATE_PLACEHOLDER_KEY"
							:preview-prompt-key="composerHasContent ? null : splitPreviewPromptKey"
							:fixed-rows="INSTANCE_AI_SPLIT_FIXED_ROWS"
							:submit-label="i18n.baseText('experiments.instanceAiSplitEmptyState.cta.buildWithAi')"
							:submit-active-requires-focus="true"
							:suggestion-catalog-version="INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION"
							@submit="handleSubmit"
							@content-change="composerHasContent = $event"
						>
							<template v-if="canSelectProject || showRunTargetPicker" #footer>
								<div :class="$style.inputFooter" data-test-id="instance-ai-split-project-select">
									<ProjectSelect v-if="canSelectProject" v-model="selectedProject" />
									<RunTargetPicker v-if="showRunTargetPicker" v-model="runTarget" :links="links" />
								</div>
							</template>
						</InstanceAiInput>
					</div>
				</template>
			</InstanceAiSplitEmptyState>
			<div v-else ref="emptyLayout" :class="$style.emptyLayout">
				<InstanceAiEmptyState :title-key="emptyStateTitleKey" :show-title-icon="true" />
				<div ref="centeredInput" :class="$style.centeredInput">
					<InstanceAiFreeNudge
						:eligible="
							store.creditsQuota !== undefined &&
							!creditBanner.visible.value &&
							settingsStore.isWorkflowBuilderAvailable
						"
					/>
					<CreditWarningBanner
						v-if="creditBanner.visible.value"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						:amounts-hidden="quotaLocked"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
						@dismiss="creditBanner.dismiss()"
					/>
					<WorkflowBuilderUnavailableNotice v-if="!settingsStore.isWorkflowBuilderAvailable" />
					<LimitedModeNotice />
					<InstanceAiInput
						ref="chatInputRef"
						:is-submitting="isStartingThread"
						:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
						:mentions-enabled="mentionsEnabled"
						:mention-project-id="selectedProject"
						v-bind="emptyStatePromptSuggestionProps"
						@submit="handleSubmit"
						@workflow-preview="handleWorkflowPreview"
						@content-change="composerHasContent = $event"
					>
						<template v-if="canSelectProject || showRunTargetPicker" #footer>
							<div :class="$style.inputFooter">
								<ProjectSelect v-if="canSelectProject" v-model="selectedProject" />
								<RunTargetPicker v-if="showRunTargetPicker" v-model="runTarget" :links="links" />
							</div>
						</template>
					</InstanceAiInput>
				</div>
				<Transition name="workflow-preview-fade">
					<div
						v-if="activeWorkflowPreview && hasSpaceForPreview"
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

		<DitherTrailGrid :height="640" />
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
	border: var(--border);
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
	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
	position: relative;
	z-index: 1;
}

.emptyLayout {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
	padding-top: 20vh;
	overflow-y: auto;
	overflow-x: hidden;
}

.centeredInput {
	width: 100%;
	max-width: 680px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
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
