<script setup lang="ts">
import { NODE_CREATOR_OPEN_SOURCES } from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useChatPanelStore } from '@/features/assistant/chatPanel.store';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nIcon } from '@n8n/design-system';

const nodeCreatorStore = useNodeCreatorStore();
const chatPanelStore = useChatPanelStore();
const i18n = useI18n();

const isChatWindowOpen = computed(
	() => chatPanelStore.isOpen && chatPanelStore.isBuilderModeActive,
);

const onAddFirstStepClick = () => {
	if (nodeCreatorStore.isCreateNodeActive) {
		nodeCreatorStore.isCreateNodeActive = false;
	} else {
		nodeCreatorStore.openNodeCreatorForTriggerNodes(
			NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON,
		);
	}
};

async function onBuildWithAIClick() {
	await chatPanelStore.toggle({ mode: 'builder' });
}
</script>

<template>
	<div :class="$style.choicePrompt" data-test-id="canvas-choice-prompt" @click.stop @mousedown.stop>
		<!-- Add First Step Button -->
		<div :class="$style.option">
			<div
				:class="[
					$style.selectedButtonHighlight,
					{ [$style.highlighted]: nodeCreatorStore.isCreateNodeActive },
				]"
			>
				<button
					:class="$style.button"
					data-test-id="canvas-add-first-step-button"
					@mousedown.stop.prevent="onAddFirstStepClick"
				>
					<N8nIcon icon="plus" color="foreground-xdark" :size="40" />
				</button>
			</div>
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
			<div :class="[$style.selectedButtonHighlight, { [$style.highlighted]: isChatWindowOpen }]">
				<button
					:class="[$style.button]"
					data-test-id="canvas-build-with-ai-button"
					@mousedown.stop.prevent="onBuildWithAIClick"
				>
					<N8nIcon icon="wand-sparkles" color="foreground-xdark" :size="40" />
				</button>
			</div>
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
	gap: var(--spacing--lg);
}

.option {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100px;
}

.button {
	background: var(--color--foreground--tint-2);
	border: 2px dashed var(--color--foreground--shade-2);
	border-radius: var(--radius--lg);
	padding: 0;

	min-width: 100px;
	min-height: 100px;
	cursor: pointer;
}

.selectedButtonHighlight {
	border-radius: var(--radius--lg);

	&.highlighted {
		box-shadow: 0 0 0 7px var(--color-canvas-selected);
	}
}

.label {
	width: max-content;
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	color: var(--color--text--shade-1);
	margin-top: var(--spacing--2xs);
	text-align: center;
}

.orDivider {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100px;
	margin-bottom: calc(var(--line-height--xl) * 1em + var(--spacing--2xs));
}

.orText {
	font-size: var(--font-size--md);
	color: var(--color--text);
	font-weight: var(--font-weight--regular);
	padding: 0 var(--spacing--xs);
}
</style>
