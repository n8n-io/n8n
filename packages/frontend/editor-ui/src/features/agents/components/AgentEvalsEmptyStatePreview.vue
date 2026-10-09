<script setup lang="ts">
/**
 * Alternate empty state for the evals tab, shown instead of the plain
 * "Generate test cases" card when `useTestAgentPreviewExperiment` is on.
 */
import { ref } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentAvatar from '@/features/agents/components/AgentAvatar.vue';
import AgentEvalExamplesSlider from '@/features/agents/components/AgentEvalExamplesSlider.vue';

defineProps<{
	examples: AgentEvalDraftCase[];
	/** True while the examples are still being generated — shows a loader in
	 *  the slider's place instead of an empty, interactive one. */
	loading?: boolean;
	/** True from "Add checks" click until the trim-and-run has actually started. */
	addingChecks?: boolean;
	/** No `agent:update` — a viewer can look at the preview but not commit it. */
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'add-example': [input: string];
	'add-checks': [count: number];
}>();

const i18n = useI18n();

const examplesSlider = ref<InstanceType<typeof AgentEvalExamplesSlider> | null>(null);

function onAddChecks() {
	emit('add-checks', examplesSlider.value?.sliderValue ?? 1);
}

// Placeholder: focuses the slider's own "add your own" input rather than
// opening a separate flow — nothing else is wired up yet.
function onAddYourOwn() {
	examplesSlider.value?.focusOwnInput();
}
</script>

<template>
	<div :class="$style.root" data-testid="agent-evals-empty-state-preview">
		<div :class="$style.avatars">
			<AgentAvatar kind="waiting" size="lg" />
			<AgentAvatar kind="waiting" size="lg" />
			<AgentAvatar kind="waiting" size="lg" />
		</div>
		<N8nText tag="h3" color="text-dark" bold :class="$style.title">
			{{ i18n.baseText('agents.builder.agentEvals.empty.preview.title') }}
		</N8nText>
		<N8nText color="text-light" size="small" :class="$style.description">
			{{ i18n.baseText('agents.builder.agentEvals.empty.preview.description') }}
		</N8nText>

		<AgentEvalExamplesSlider
			ref="examplesSlider"
			:examples="examples"
			:loading="loading"
			:disabled="disabled || addingChecks"
			@add-example="emit('add-example', $event)"
		/>

		<div v-if="!loading" :class="$style.actions">
			<N8nButton
				variant="solid"
				size="small"
				:disabled="disabled"
				:loading="addingChecks"
				data-testid="agent-evals-empty-preview-add-checks"
				@click="onAddChecks"
			>
				{{
					i18n.baseText('agents.builder.agentEvals.empty.preview.addChecks', {
						adjustToNumber: examplesSlider?.sliderValue ?? 1,
						interpolate: { count: String(examplesSlider?.sliderValue ?? 1) },
					})
				}}
			</N8nButton>
			<N8nButton
				variant="outline"
				size="small"
				:disabled="disabled || addingChecks"
				data-testid="agent-evals-empty-preview-add-own"
				@click="onAddYourOwn"
			>
				{{ i18n.baseText('agents.builder.agentEvals.empty.preview.addYourOwn') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	max-width: 420px;
	margin: var(--spacing--md) auto;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	width: 100%;
}

.avatars {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.title {
	margin: 0;
}

.description {
	display: block;
	max-width: 260px;
	line-height: 1.5;
	text-align: center;
	margin-bottom: var(--spacing--xs);
}
</style>
