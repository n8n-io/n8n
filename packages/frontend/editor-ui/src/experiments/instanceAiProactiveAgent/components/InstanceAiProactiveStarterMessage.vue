<script setup lang="ts">
import { computed, watch } from 'vue';
import { N8nAssistantIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import InstanceAiPromptSuggestions from '@/features/ai/instanceAi/components/InstanceAiPromptSuggestions.vue';
import type { InstanceAiEmptyStateSuggestion } from '@/features/ai/instanceAi/emptyStateSuggestions';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useInstanceAiPromptSuggestionsTelemetry } from '@/features/ai/instanceAi/instanceAiPromptSuggestions.telemetry';

const props = defineProps<{
	suggestions: readonly InstanceAiEmptyStateSuggestion[];
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [message: string];
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const promptSuggestionsTelemetry = useInstanceAiPromptSuggestionsTelemetry();

const canShowSuggestions = computed(() => props.suggestions.length > 0 && props.disabled !== true);

const visibleSuggestionThreadId = computed(() =>
	canShowSuggestions.value ? store.currentThreadId : null,
);

watch(
	visibleSuggestionThreadId,
	(threadId) => {
		if (!threadId) return;

		promptSuggestionsTelemetry.trackSuggestionsShown({
			threadId,
			researchMode: store.researchMode,
		});
	},
	{ immediate: true },
);

function getTelemetryContext() {
	return {
		threadId: store.currentThreadId,
		researchMode: store.researchMode,
	};
}

function handleQuickExamplesOpened(payload: { suggestionId: string; position: number }) {
	if (payload.suggestionId !== 'quick-examples') {
		return;
	}

	promptSuggestionsTelemetry.trackQuickExamplesOpened({
		...getTelemetryContext(),
		suggestionId: payload.suggestionId,
		position: payload.position,
	});
}

function handleSuggestionSubmit(payload: {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
}) {
	promptSuggestionsTelemetry.trackSuggestionSelected({
		...getTelemetryContext(),
		suggestionId: payload.suggestionId,
		suggestionKind: payload.suggestionKind,
		position: payload.position,
	});
	emit('submit', i18n.baseText(payload.promptKey));
}
</script>

<template>
	<article :class="$style.container" data-test-id="instance-ai-proactive-starter">
		<header :class="$style.meta">
			<N8nText size="xsmall" :compact="true" :class="$style.metaLabel">
				{{ i18n.baseText('experiments.instanceAiProactiveAgent.meta' as BaseTextKey) }}
			</N8nText>
		</header>

		<div :class="$style.avatar" aria-hidden="true">
			<N8nAssistantIcon size="large" />
		</div>

		<section :class="$style.bubble">
			<N8nText tag="h2" size="large" bold :class="$style.title">
				{{ i18n.baseText('experiments.instanceAiProactiveAgent.title' as BaseTextKey) }}
			</N8nText>
			<N8nText tag="p" size="medium" :class="$style.body">
				{{ i18n.baseText('experiments.instanceAiProactiveAgent.body' as BaseTextKey) }}
			</N8nText>
		</section>

		<div v-if="canShowSuggestions" :class="$style.suggestions">
			<InstanceAiPromptSuggestions
				:suggestions="props.suggestions"
				:disabled="props.disabled === true"
				@quick-examples-opened="handleQuickExamplesOpened"
				@submit-suggestion="handleSuggestionSubmit"
			/>
		</div>
	</article>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.container {
	display: grid;
	grid-template-columns: var(--spacing--xl) minmax(0, 1fr);
	column-gap: var(--spacing--sm);
	row-gap: var(--spacing--xs);
	align-items: start;
	width: 100%;
	max-width: 720px;
	padding-top: var(--spacing--md);
}

.meta {
	grid-column: 2;
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-height: var(--spacing--md);

	@include motion.fade-in-up;
	animation-duration: var(--duration--base);
	animation-fill-mode: both;
}

.metaLabel {
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--medium);
	letter-spacing: 0.01em;
}

.avatar {
	grid-column: 1;
	grid-row: 2;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--full);
	background: var(--assistant--color--highlight-gradient);
	box-shadow: var(--shadow--xs);

	@include motion.fade-in-up;
	animation-delay: 80ms;
	animation-duration: var(--duration--base);
	animation-fill-mode: both;
}

.bubble {
	grid-column: 2;
	grid-row: 2;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm) var(--spacing--md);
	background: var(--background--surface);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--3xs) var(--radius--md) var(--radius--md) var(--radius--md);
	box-shadow: var(--shadow--sm);

	@include motion.fade-in-up;
	animation-delay: 80ms;
	animation-duration: var(--duration--base);
	animation-fill-mode: both;
}

.title {
	margin: 0;
	color: var(--color--text);
	line-height: var(--line-height--lg);
}

.body {
	margin: 0;
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
}

.suggestions {
	grid-column: 2;
	grid-row: 3;

	@include motion.fade-in-up;
	animation-delay: 160ms;
	animation-duration: var(--duration--base);
	animation-fill-mode: both;

	// The shared suggestion row centers itself by default; left-align it under
	// the bubble so the chips line up with the speech-bubble's content edge.
	:global([class*='suggestionRow']) {
		justify-content: flex-start;
	}
}
</style>
