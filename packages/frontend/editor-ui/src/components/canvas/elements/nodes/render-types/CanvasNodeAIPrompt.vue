<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
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

// Composables
const i18n = useI18n();
const router = useRouter();
const message = useMessage();
const telemetry = useTelemetry();

// Stores
const nodeCreatorStore = useNodeCreatorStore();
const builderStore = useBuilderStore();
const workflowsStore = useWorkflowsStore();

// Services
const workflowSaver = useWorkflowSaving({ router });

// Component state
const prompt = ref('');
const userEditedPrompt = ref(false);
const isFocused = ref(false);
const isLoading = ref(false);

// Computed properties
const hasContent = computed(() => prompt.value.trim().length > 0);

// Static data
const suggestions = ref(WORKFLOW_SUGGESTIONS);

/**
 * Handles form submission to build a workflow from the prompt
 */
async function onSubmit() {
	if (!hasContent.value || builderStore.streaming) return;
	isLoading.value = true;

	const isNewWorkflow = workflowsStore.isNewWorkflow;

	// Save the workflow to get workflow ID which is used for session
	if (isNewWorkflow) {
		await workflowSaver.saveCurrentWorkflow();
	}

	// Here we need to await for chat to open and session to be loaded
	await builderStore.openChat();
	isLoading.value = false;
	// Always pass initialGeneration as true from canvas since the prompt only shows on empty canvas
	builderStore.sendChatMessage({ text: prompt.value, source: 'canvas', initialGeneration: true });
}

/**
 * Handles clicking on a suggestion pill
 * @param suggestion - The workflow suggestion that was clicked
 */
async function onSuggestionClick(suggestion: WorkflowSuggestion) {
	// Track telemetry
	telemetry.track('User clicked suggestion pill', {
		prompt: prompt.value,
		suggestion: suggestion.id,
	});

	// Show confirmation if there's content AND the user has edited the prompt
	if (hasContent.value && userEditedPrompt.value) {
		const confirmed = await message.confirm(
			i18n.baseText('aiAssistant.builder.canvasPrompt.confirmMessage'),
			i18n.baseText('aiAssistant.builder.canvasPrompt.confirmTitle'),
			{
				confirmButtonText: i18n.baseText('aiAssistant.builder.canvasPrompt.confirmButton'),
				cancelButtonText: i18n.baseText('aiAssistant.builder.canvasPrompt.cancelButton'),
			},
		);

		if (confirmed !== MODAL_CONFIRM) return;
	}

	// Set the prompt without submitting
	prompt.value = suggestion.prompt;

	// Reset the edited flag
	userEditedPrompt.value = false;
}

/**
 * Opens the node creator for adding trigger nodes manually
 */
function onAddNodeClick() {
	if (builderStore.streaming) return;

	nodeCreatorStore.openNodeCreatorForTriggerNodes(
		NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON,
	);
}
</script>

<template>
	<article :class="$style.container" data-test-id="canvas-ai-prompt">
		<header>
			<h2 :class="$style.title">{{ i18n.baseText('aiAssistant.builder.canvasPrompt.title') }}</h2>
		</header>

		<!-- Prompt input section -->
		<section
			:class="[$style.promptContainer, { [$style.focused]: isFocused }]"
			@click.stop
			@dblclick.stop
			@mousedown.stop
			@scroll.stop
			@wheel.stop
		>
			<form :class="$style.form" @submit.prevent="onSubmit">
				<n8n-input
					v-model="prompt"
					name="aiBuilderPrompt"
					:class="$style.formTextarea"
					type="textarea"
					:disabled="isLoading || builderStore.streaming"
					:placeholder="i18n.baseText('aiAssistant.builder.placeholder')"
					:read-only="false"
					:rows="15"
					:maxlength="1000"
					@focus="isFocused = true"
					@blur="isFocused = false"
					@keydown.meta.enter.stop="onSubmit"
					@input="userEditedPrompt = true"
				/>
				<footer :class="$style.formFooter">
					<n8n-button
						native-type="submit"
						:disabled="!hasContent || builderStore.streaming"
						:loading="isLoading"
						@keydown.enter="onSubmit"
					>
						{{ i18n.baseText('aiAssistant.builder.canvasPrompt.buildWorkflow') }}
					</n8n-button>
				</footer>
			</form>
		</section>

		<!-- Suggestion pills section -->
		<section :class="$style.pillsContainer" role="group" aria-label="Workflow suggestions">
			<button
				v-for="suggestion in suggestions"
				:key="suggestion.id"
				:class="$style.suggestionPill"
				:disabled="builderStore.streaming"
				type="button"
				@click="onSuggestionClick(suggestion)"
			>
				{{ suggestion.summary }}
			</button>
		</section>

		<!-- Divider -->
		<div :class="$style.orDivider" role="separator">
			<span :class="$style.orText">{{ i18n.baseText('generic.or') }}</span>
		</div>

		<!-- Manual node creation section -->
		<section :class="$style.startManually" @click.stop="onAddNodeClick">
			<button
				:class="$style.addButton"
				:disabled="builderStore.streaming"
				type="button"
				aria-label="Add node manually"
			>
				<n8n-icon icon="plus" :size="40" />
			</button>
			<div :class="$style.startManuallyLabel">
				<strong :class="$style.startManuallyText">
					{{ i18n.baseText('aiAssistant.builder.canvasPrompt.startManually.title') }}
				</strong>
				<span :class="$style.startManuallySubtitle">
					{{ i18n.baseText('aiAssistant.builder.canvasPrompt.startManually.subTitle') }}
				</span>
			</div>
		</section>
	</article>
</template>

<style lang="scss" module>
/* Layout */
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-m);
	max-width: 710px;
}

/* Header */
.title {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-medium);
	color: var(--color-text-dark);
}

/* Prompt Input Section */
.promptContainer {
	display: flex;
	height: 128px;
	padding: var(--spacing-xs);
	padding-left: var(--spacing-s);
	flex-direction: column;
	justify-content: flex-end;
	align-items: flex-end;
	gap: var(--spacing-s);
	align-self: stretch;
	border-radius: var(--border-radius-large);
	border: 1px solid var(--color-foreground-xdark);
	background: var(--color-background-xlight);
	transition: border-color 0.2s ease;

	&.focused {
		border-color: var(--prim-color-secondary);
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

.formTextarea {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	border: 0;

	:global(.el-textarea__inner) {
		height: 100%;
		min-height: 0;
		overflow-y: auto;
		border: 0;
		background: transparent;
		resize: none;
		font-family: var(--font-family);
		padding: 0;

		/* Custom scrollbar styles */
		@supports not (selector(::-webkit-scrollbar)) {
			scrollbar-width: thin;
		}
		@supports selector(::-webkit-scrollbar) {
			&::-webkit-scrollbar {
				width: var(--spacing-2xs);
			}
			&::-webkit-scrollbar-thumb {
				border-radius: var(--spacing-xs);
				background: var(--color-foreground-dark);
				border: var(--spacing-5xs) solid white;
			}
		}
	}
}

.formFooter {
	display: flex;
	justify-content: flex-end;
}

/* Suggestion Pills Section */
.pillsContainer {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing-2xs);
	flex-wrap: wrap;
}

.suggestionPill {
	display: flex;
	padding: var(--spacing-2xs) var(--spacing-xs);
	justify-content: center;
	align-items: center;
	gap: var(--spacing-2xs);
	border-radius: 56px;
	border: var(--border-base);
	background: var(--color-background-xlight);
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	font-weight: var(--font-weight-regular);

	&:hover:not(:disabled) {
		color: var(--color-primary);
		border-color: var(--color-primary);
		background: var(--color-background-xlight);
	}
}

/* Divider Section */
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

/* Manual Node Creation Section */
.startManually {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	cursor: pointer;

	.addButton {
		background: var(--color-foreground-xlight);
		border: 1px dashed var(--color-foreground-xdark);
		border-radius: var(--border-radius-base);
		min-width: 80px;
		min-height: 80px;
		cursor: pointer;
		transition: all 0.3s ease;

		svg {
			width: 31px !important;
			height: 40px;
			path {
				color: var(--color-foreground-xdark);
				fill: var(--color-foreground-xdark);
				transition: all 0.3s ease;
			}
		}
	}

	&:hover .addButton {
		border-color: var(--color-button-secondary-hover-active-focus-border);

		svg path {
			color: var(--color-primary);
			fill: var(--color-primary);
		}
	}

	.startManuallyLabel {
		display: flex;
		flex-direction: column;
		font-size: var(--font-size-s);
		line-height: var(--font-line-height-xloose);

		.startManuallyText {
			font-weight: var(--font-weight-medium);
			color: var(--color-text-dark);
		}

		.startManuallySubtitle {
			font-weight: var(--font-weight-regular);
			color: var(--color-text-base);
		}
	}
}
</style>
