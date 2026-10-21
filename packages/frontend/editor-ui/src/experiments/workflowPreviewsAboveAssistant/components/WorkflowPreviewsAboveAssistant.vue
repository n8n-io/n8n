<!-- Experiment cleanup (124_workflow_previews_above_assistant) -->
<script lang="ts" setup>
import { ref } from 'vue';
import { N8nButton, N8nIconButton } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { FEATURED_WORKFLOW_PREVIEW_EXAMPLES, WORKFLOW_PREVIEW_EXAMPLES } from '../examples';
import type { WorkflowPreviewExample } from '../types';
import WorkflowPreviewCard from './WorkflowPreviewCard.vue';
import WorkflowPreviewCatalogModal from './WorkflowPreviewCatalogModal.vue';

const i18n = useI18n();

const emit = defineEmits<{
	'preview-prompt': [promptKey: BaseTextKey | null];
	'use-example': [example: WorkflowPreviewExample, position: number];
}>();

const catalogOpen = ref(false);

function examplePosition(example: WorkflowPreviewExample) {
	return WORKFLOW_PREVIEW_EXAMPLES.findIndex((candidate) => candidate.id === example.id) + 1;
}

function useCatalogExample(example: WorkflowPreviewExample, position: number) {
	catalogOpen.value = false;
	emit('use-example', example, position);
}
</script>

<template>
	<section :class="$style.gallery" data-test-id="workflow-previews-above-assistant">
		<div :class="$style.cards" data-test-id="workflow-preview-cards">
			<WorkflowPreviewCard
				v-for="(example, index) in FEATURED_WORKFLOW_PREVIEW_EXAMPLES"
				:key="example.id"
				:class="$style.cardEnter"
				:style="{ '--enter-index': index }"
				:example="example"
				:position="examplePosition(example)"
				@preview-prompt="emit('preview-prompt', example.promptKey)"
				@clear-prompt="emit('preview-prompt', null)"
				@use="emit('use-example', example, examplePosition(example))"
			/>
		</div>
		<div
			:class="[$style.actions, $style.cardEnter]"
			:style="{ '--enter-index': FEATURED_WORKFLOW_PREVIEW_EXAMPLES.length }"
			data-test-id="workflow-preview-actions"
		>
			<N8nIconButton
				variant="outline"
				icon="refresh-cw"
				:aria-label="i18n.baseText('experiments.workflowPreviewsAboveAssistant.shuffleExamples')"
				:title="i18n.baseText('experiments.workflowPreviewsAboveAssistant.shuffleExamples')"
				data-test-id="workflow-preview-shuffle"
			/>
			<N8nButton
				variant="outline"
				data-test-id="workflow-preview-see-more"
				@click="catalogOpen = true"
			>
				{{ i18n.baseText('experiments.workflowPreviewsAboveAssistant.seeMoreExamples') }}
			</N8nButton>
		</div>
		<WorkflowPreviewCatalogModal v-model:open="catalogOpen" @use-example="useCatalogExample" />
	</section>
</template>

<style lang="scss" module>
@use './cardEnter';

.gallery {
	// The cards wait a moment after the empty state appears before fading in.
	--enter-delay: 1s;

	width: 100%;
	container-type: inline-size;
}

.cards {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--sm);
	align-items: stretch;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--md);
}

.cardEnter {
	@include cardEnter.card-enter;
}

@container (max-width: 52rem) {
	.cards {
		grid-template-columns: 1fr;
	}
}
</style>
