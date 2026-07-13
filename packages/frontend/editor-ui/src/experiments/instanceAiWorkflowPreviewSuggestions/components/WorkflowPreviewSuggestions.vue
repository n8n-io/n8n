<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { onUnmounted, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { type WorkflowPreviewSuggestion } from '../suggestions';

const PREVIEW_HOVER_DELAY_MS = 30;

const props = defineProps<{
	suggestions: readonly WorkflowPreviewSuggestion[];
	disabled: boolean;
}>();

interface InsertSuggestionPayload {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt';
	position: number;
}

const emit = defineEmits<{
	'preview-change': [promptKey: BaseTextKey | null];
	'insert-suggestion': [payload: InsertSuggestionPayload];
	'workflow-preview': [workflowFile: string | null];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const activePreview = ref<string | null>(null);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
const hoverStartTimes = new Map<string, number>();

function clearHoverTimer() {
	if (!hoverTimer) return;
	clearTimeout(hoverTimer);
	hoverTimer = null;
}

function trackHoverEnd(suggestionId: string) {
	const startTime = hoverStartTimes.get(suggestionId);
	if (startTime === undefined) return;
	hoverStartTimes.delete(suggestionId);

	telemetry.track('AI Assistant suggestion button hovered', {
		suggestion_id: suggestionId,
		seconds: Math.floor((Date.now() - startTime) / 1000),
	});
}

function clearPreview() {
	clearHoverTimer();
	for (const id of hoverStartTimes.keys()) {
		trackHoverEnd(id);
	}
	activePreview.value = null;
	emit('preview-change', null);
	emit('workflow-preview', null);
}

function handleSuggestionEnter(suggestion: WorkflowPreviewSuggestion) {
	if (props.disabled) return;

	hoverStartTimes.set(suggestion.id, Date.now());
	clearHoverTimer();
	hoverTimer = setTimeout(() => {
		hoverTimer = null;
		activePreview.value = suggestion.id;
		emit('preview-change', suggestion.promptKey);
		emit('workflow-preview', suggestion.workflowFile);
	}, PREVIEW_HOVER_DELAY_MS);
}

function handleSuggestionFocus(suggestion: WorkflowPreviewSuggestion) {
	if (props.disabled) return;
	clearHoverTimer();
	activePreview.value = suggestion.id;
	emit('preview-change', suggestion.promptKey);
	emit('workflow-preview', suggestion.workflowFile);
}

function handleSuggestionClick(suggestion: WorkflowPreviewSuggestion) {
	if (props.disabled) return;

	const position = props.suggestions.indexOf(suggestion) + 1;
	telemetry.track('AI Assistant suggestion button clicked', {
		suggestion_id: suggestion.id,
	});

	clearPreview();
	emit('insert-suggestion', {
		promptKey: suggestion.promptKey,
		suggestionId: suggestion.id,
		suggestionKind: 'prompt',
		position,
	});
}

onUnmounted(clearPreview);
</script>

<template>
	<div :class="$style.suggestions" data-test-id="instance-ai-workflow-preview-suggestions">
		<div :class="$style.suggestionRow">
			<button
				v-for="(suggestion, index) in props.suggestions"
				:key="suggestion.id"
				type="button"
				:class="[
					$style.suggestionButton,
					activePreview === suggestion.id && $style.suggestionButtonActive,
				]"
				:style="{ animationDelay: `${index * 50}ms` }"
				:data-test-id="`instance-ai-suggestion-${suggestion.id}`"
				:disabled="props.disabled"
				@click="handleSuggestionClick(suggestion)"
				@mouseenter="handleSuggestionEnter(suggestion)"
				@mouseleave="clearPreview"
				@focus="handleSuggestionFocus(suggestion)"
				@blur="clearPreview"
			>
				<N8nIcon :icon="suggestion.icon" :size="12" :class="$style.suggestionIcon" />
				<span>{{ i18n.baseText(suggestion.labelKey) }}</span>
			</button>
			<a
				href="https://n8n.io/workflows/"
				target="_blank"
				rel="noopener noreferrer"
				:class="$style.seeAllLink"
			>
				<span>{{
					i18n.baseText(
						'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.seeAll' as BaseTextKey,
					)
				}}</span>
				<N8nIcon icon="arrow-right" :size="12" />
			</a>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@/features/ai/shared/styles/prompt-suggestion-buttons' as promptSuggestions;

.suggestions {
	width: 100%;
}

.suggestionRow {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.suggestionButton {
	@include promptSuggestions.prompt-suggestion-button;

	flex: 0 0 auto;
	white-space: nowrap;
}

.suggestionButtonActive {
	@include promptSuggestions.prompt-suggestion-button-active;
}

.suggestionIcon {
	@include promptSuggestions.prompt-suggestion-icon;

	.suggestionButton:hover &,
	.suggestionButton:focus-visible & {
		opacity: 1;
	}
}

.seeAllLink {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	flex: 0 0 auto;
	white-space: nowrap;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}
</style>
