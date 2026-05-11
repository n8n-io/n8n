<script setup lang="ts">
import { computed, watch } from 'vue';
import { N8nText } from '@n8n/design-system';
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
		<N8nText tag="h2" size="large" bold :class="$style.title">
			{{ i18n.baseText('experiments.instanceAiProactiveAgent.title' as BaseTextKey) }}
		</N8nText>
		<N8nText tag="p" size="large" :class="$style.body">
			{{ i18n.baseText('experiments.instanceAiProactiveAgent.body' as BaseTextKey) }}
		</N8nText>

		<InstanceAiPromptSuggestions
			v-if="canShowSuggestions"
			:suggestions="props.suggestions"
			:disabled="props.disabled === true"
			@quick-examples-opened="handleQuickExamplesOpened"
			@submit-suggestion="handleSuggestionSubmit"
		/>
	</article>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	width: 100%;
	max-width: 800px;
}

.title,
.body {
	margin: 0;
}

.body {
	white-space: pre-wrap;
}
</style>
