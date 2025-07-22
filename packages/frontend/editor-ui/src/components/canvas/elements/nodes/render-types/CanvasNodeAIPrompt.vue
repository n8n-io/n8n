<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useBuilderStore } from '@/stores/builder.store';
import { useRouter } from 'vue-router';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useMessage } from '@/composables/useMessage';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { MODAL_CONFIRM, NODE_CREATOR_OPEN_SOURCES } from '@/constants';
import { WORKFLOW_SUGGESTIONS } from '@/constants/workflowSuggestions';
import type { WorkflowSuggestion } from '@/constants/workflowSuggestions';

const emit = defineEmits<{
	delete: [id: string];
}>();
const i18n = useI18n();
const router = useRouter();
const message = useMessage();
const telemetry = useTelemetry();
const nodeCreatorStore = useNodeCreatorStore();

const { id } = useCanvasNode();
const builderStore = useBuilderStore();
const workflowsStore = useWorkflowsStore();

const workflowSaver = useWorkflowSaving({ router });
const isPromptVisible = ref(true);
const isFocused = ref(false);

const prompt = ref('');
const userEditedPrompt = ref(false);

const hasContent = computed(() => prompt.value.trim().length > 0);
const suggestions = ref(WORKFLOW_SUGGESTIONS);

async function onSubmit() {
	const isNewWorkflow = workflowsStore.isNewWorkflow;

	// Save the workflow to get workflow ID which is used for session
	if (isNewWorkflow) {
		await workflowSaver.saveCurrentWorkflow();
	}

	// Here we need to await for chat to open and session to be loaded
	await builderStore.openChat();
	emit('delete', id.value);

	builderStore.sendChatMessage({ text: prompt.value, source: 'canvas' });
	isPromptVisible.value = false;
}

async function onSuggestionClick(suggestion: WorkflowSuggestion) {
	// Track telemetry
	telemetry.track('User clicked suggestion pill', {
		prompt: prompt.value,
		suggestion: suggestion.id,
	});

	// Show confirmation if there's content AND the user has edited it
	if (hasContent.value && userEditedPrompt.value) {
		const confirmed = await message.confirm(
			i18n.baseText('aiAssistant.builder.suggestionPills.confirmMessage'),
			i18n.baseText('aiAssistant.builder.suggestionPills.confirmTitle'),
			{
				confirmButtonText: i18n.baseText('aiAssistant.builder.suggestionPills.confirmButton'),
				cancelButtonText: i18n.baseText('aiAssistant.builder.suggestionPills.cancelButton'),
			},
		);

		if (confirmed !== MODAL_CONFIRM) return;
	}

	// Set the prompt without submitting
	prompt.value = suggestion.prompt;

	// Reset the edited flag
	userEditedPrompt.value = false;
}

function onAddNodeClick() {
	nodeCreatorStore.openNodeCreatorForTriggerNodes(
		NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON,
	);
}
</script>

<template>
	<div v-if="isPromptVisible" :class="$style.container" data-test-id="canvas-ai-prompt">
		<!-- Title -->
		<h2 :class="$style.title">{{ i18n.baseText('aiAssistant.builder.title') }}</h2>

		<!-- Prompt input container -->
		<div :class="[$style.promptContainer, { [$style.focused]: isFocused }]">
			<form :class="$style.form" @submit.prevent="onSubmit">
				<n8n-input
					v-model="prompt"
					:class="$style.form_textarea"
					type="textarea"
					:disabled="builderStore.streaming"
					:placeholder="i18n.baseText('aiAssistant.builder.placeholder')"
					:read-only="false"
					:rows="15"
					@focus="isFocused = true"
					@blur="isFocused = false"
					@keydown.meta.enter.stop="onSubmit"
					@input="userEditedPrompt = true"
				/>
				<div :class="$style.form_footer">
					<n8n-button
						native-type="submit"
						:disabled="!hasContent || builderStore.streaming"
						@keydown.enter="onSubmit"
						>{{ i18n.baseText('aiAssistant.builder.buildWorkflow') }}</n8n-button
					>
				</div>
			</form>
		</div>

		<!-- Suggestion pills -->
		<div :class="$style.pillsContainer">
			<button
				v-for="suggestion in suggestions"
				:key="suggestion.id"
				:class="$style.suggestionPill"
				@click="onSuggestionClick(suggestion)"
			>
				{{ suggestion.summary }}
			</button>
		</div>

		<!-- Or divider -->
		<div :class="$style.orDivider">
			<span :class="$style.orText">{{ i18n.baseText('generic.or') }}</span>
		</div>

		<!-- Start manually section -->
		<div :class="$style.startManually" @click.stop="onAddNodeClick">
			<button :class="$style.addButton">
				<n8n-icon icon="plus" color="foreground-xdark" :size="40" />
			</button>
			<div :class="$style.startManuallyLabel">
				<span :class="$style.startManuallyText">
					{{ i18n.baseText('aiAssistant.builder.startManually.title') }}
				</span>
				<span :class="$style.startManuallySubtitle">
					{{ i18n.baseText('aiAssistant.builder.startManually.subTitle') }}
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
	max-width: 710px;
}

.title {
	font-size: var(--font-size-l);
	font-weight: var(--font-weight-normal);
	color: var(--color-text-dark);
}

.promptContainer {
	display: flex;
	height: 128px;
	padding: var(--spacing-xs);
	flex-direction: column;
	justify-content: flex-end;
	align-items: flex-end;
	gap: var(--spacing-s);
	align-self: stretch;
	border-radius: var(--border-radius-large);
	border: 1px solid var(--color-foreground-xdark);
	background: var(--color-background-xlight);
	box-shadow: 0px 0px 0px 3px rgba(0, 0, 0, 0.04);

	&.focused {
		border: 1px solid var(--color-primary);
	}
}

.form {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	width: 100%;
	gap: var(--spacing-xs);
}

.form_textarea {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	border: 0;

	:global(.el-textarea__inner) {
		display: flex;
		padding: var(--spacing-2xs) var(--spacing-s);
		align-items: flex-start;
		gap: 75px;
		flex: 1 0 0;
		align-self: stretch;
		border-radius: var(--border-radius-base);
		height: 100%;
		min-height: 0;
		overflow-y: auto;
		border: 0;
		background: transparent;
		resize: none;
		font-family: var(--font-family);
	}
}

.form_footer {
	display: flex;
	justify-content: flex-end;
}

.pillsContainer {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing-2xs);
	flex-wrap: wrap;
}

.suggestionPill {
	display: flex;
	height: 33px;
	padding: 0 13px;
	justify-content: center;
	align-items: center;
	gap: var(--spacing-2xs);
	border-radius: 56px;
	border: 1px solid var(--color-foreground-base);
	background: var(--color-background-xlight);
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	font-family: var(--font-family);
	font-weight: var(--font-weight-regular);

	&:hover {
		border-color: var(--color-primary);
		background: var(--color-background-light);
	}
}

.orDivider {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing-s);
	align-self: stretch;
	position: relative;

	&::before,
	&::after {
		content: '';
		flex: 1;
		height: 1px;
		background-color: var(--color-foreground-base);
	}
}

.orText {
	font-size: var(--font-size-m);
	color: var(--color-text-base);
	padding: 0 var(--spacing-s);
}

.startManually {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.startManuallyLabel {
	display: flex;
	flex-direction: column;
}

.addButton {
	background: var(--color-foreground-xlight);
	border: 1px dashed var(--color-foreground-xdark);
	border-radius: var(--border-radius-small);
	padding: 0;
	min-width: 69px;
	min-height: 69px;
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover svg path {
		fill: var(--color-primary);
	}
}

.startManuallyText {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-medium);
	line-height: var(--font-line-height-xloose);
	color: var(--color-text-dark);
}

.startManuallySubtitle {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-regular);
	line-height: var(--font-line-height-xloose);
	color: var(--color-text-base);
}
</style>
