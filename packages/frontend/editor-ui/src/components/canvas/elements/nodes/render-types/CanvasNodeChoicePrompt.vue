<script setup lang="ts">
import { NODE_CREATOR_OPEN_SOURCES } from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useBuilderStore } from '@/stores/builder.store';
import { useI18n } from '@n8n/i18n';

import { N8nIcon } from '@n8n/design-system';

const nodeCreatorStore = useNodeCreatorStore();
const builderStore = useBuilderStore();
const i18n = useI18n();

function onAddFirstStepClick() {
	nodeCreatorStore.openNodeCreatorForTriggerNodes(
		NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON,
	);
}

async function onBuildWithAIClick() {
	await builderStore.openChat();
}
</script>

<template>
	<div :class="$style.choicePrompt" data-test-id="canvas-choice-prompt">
		<!-- Add First Step Button -->
		<div :class="$style.option">
			<button
				:class="$style.button"
				data-test-id="canvas-add-first-step-button"
				@click.stop="onAddFirstStepClick"
			>
				<N8nIcon icon="plus" color="foreground-xdark" :size="40" />
			</button>
			<p :class="$style.label">
				{{ i18n.baseText('nodeView.canvasAddButton.addFirstStep') }}
			</p>
		</div>

		<!-- Or Divider -->
		<div :class="$style.orDivider">
			<span :class="$style.orText">{{ i18n.baseText('generic.or') }}</span>
		</div>

		<!-- Build with AI Button -->
		<div :class="$style.option">
			<button
				:class="[$style.button, $style.aiButton]"
				data-test-id="canvas-build-with-ai-button"
				@click.stop="onBuildWithAIClick"
			>
				<N8nIcon icon="wand-sparkles" color="foreground-xdark" :size="40" />
			</button>
			<p :class="$style.label">
				{{ i18n.baseText('aiAssistant.builder.canvasPrompt.buildWithAI') }}
			</p>
		</div>
	</div>
</template>

<style lang="scss" module>
.choicePrompt {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-l);
}

.option {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100px;

	&:hover .button svg path {
		fill: var(--color-primary);
	}
}

.button {
	background: var(--color-foreground-xlight);
	border: 2px dashed var(--color-foreground-xdark);
	border-radius: 8px;
	padding: 0;

	min-width: 100px;
	min-height: 100px;
	cursor: pointer;

	&.aiButton {
		--button-hover-text-color: var(--color-text-base);
		--button-hover-background-color: var(--color-text-base);
	}
}

.label {
	width: max-content;
	font-weight: var(--font-weight-medium);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
	color: var(--color-text-dark);
	margin-top: var(--spacing-2xs);
	text-align: center;
}

.orDivider {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100px;
	margin-bottom: calc(var(--font-line-height-xloose) * 1em + var(--spacing-2xs));
}

.orText {
	font-size: var(--font-size-m);
	color: var(--color-text-base);
	font-weight: var(--font-weight-regular);
	padding: 0 var(--spacing-xs);
}
</style>
