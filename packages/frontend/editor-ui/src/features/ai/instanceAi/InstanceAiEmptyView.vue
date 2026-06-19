<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useResizeObserver } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceAiAttachment } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { useChatInputAutoFocus } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
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
	WorkflowPreviewSuggestions,
	WorkflowPreviewCanvas,
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS,
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_VERSION,
	getPreviewWorkflow,
	useInstanceAiWorkflowPreviewSuggestionsExperiment,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import WorkflowBuilderUnavailableNotice from './components/WorkflowBuilderUnavailableNotice.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import ProjectSelect from './components/ProjectSelect.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

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

const store = useInstanceAiStore();
const projectsStore = useProjectsStore();
const selectedProject = ref(projectsStore.personalProject?.id);
const settingsStore = useInstanceAiSettingsStore();
const { isLowCredits } = storeToRefs(store);
const rootStore = useRootStore();
const router = useRouter();
const toast = useToast();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(isLowCredits);
const { isFeatureEnabled: isProactiveAgentExperimentEnabled } =
	useInstanceAiProactiveAgentExperiment();
const { isFeatureEnabled: isPromptSuggestionsV2ExperimentEnabled } =
	useInstanceAiPromptSuggestionsV2Experiment();
const { isFeatureEnabled: isWorkflowPreviewSuggestionsExperimentEnabled } =
	useInstanceAiWorkflowPreviewSuggestionsExperiment();
const showProactiveStarter = computed(() => isProactiveAgentExperimentEnabled.value);
const activeWorkflowPreviewFile = ref<string | null>(null);
const activeWorkflowPreview = computed(() => {
	if (!activeWorkflowPreviewFile.value) return null;
	return getPreviewWorkflow(activeWorkflowPreviewFile.value) ?? null;
});

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
const emptyStatePromptSuggestionProps = computed(() => {
	if (showProactiveStarter.value) {
		return {};
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
const emptyStateTitleKey = computed<BaseTextKey>(() => {
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
	previewScale.value = Math.min(1, Math.max(0, remainingSpace / CANVAS_NATURAL_HEIGHT_PX));
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

async function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	if (!settingsStore.isWorkflowBuilderAvailable) {
		return;
	}

	if (!selectedProject.value) {
		toast.showError(new Error('Please select a project before starting a thread.'), 'Send failed');
		return;
	}

	const threadId = uuidv4();
	isStartingThread.value = true;

	// Persist the thread on the BE first. Otherwise we'd navigate to
	// `/instance-ai/:threadId` for a thread the BE doesn't know about, and the
	// follow-up `postMessage` would 404.
	try {
		await store.syncThread(threadId, selectedProject.value);
	} catch {
		isStartingThread.value = false;
		toast.showError(new Error('Failed to start a new thread. Try again.'), 'Send failed');
		return;
	}

	const thread = store.getOrCreateRuntime(threadId, selectedProject.value);
	void thread.sendMessage(message, attachments, rootStore.pushRef);
	void router.replace({
		name: INSTANCE_AI_THREAD_VIEW,
		params: { threadId },
	});
}
</script>

<template>
	<div :class="$style.chatArea">
		<InstanceAiViewHeader />

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
						<template #footer>
							<div :class="$style.inputFooter">
								<ProjectSelect v-model="selectedProject" />
							</div>
						</template>
					</InstanceAiInput>
				</div>
			</div>
			<div v-else ref="emptyLayout" :class="$style.emptyLayout">
				<InstanceAiEmptyState :title-key="emptyStateTitleKey" />
				<div ref="centeredInput" :class="$style.centeredInput">
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
						v-bind="emptyStatePromptSuggestionProps"
						@submit="handleSubmit"
						@workflow-preview="handleWorkflowPreview"
					>
						<template #footer>
							<div :class="$style.inputFooter">
								<ProjectSelect v-model="selectedProject" />
							</div>
						</template>
					</InstanceAiInput>
				</div>
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
