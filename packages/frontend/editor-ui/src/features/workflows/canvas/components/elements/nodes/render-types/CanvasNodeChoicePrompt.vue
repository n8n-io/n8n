<script setup lang="ts">
import { NODE_CREATOR_OPEN_SOURCES, VIEWS } from '@/app/constants';
import {
	isExtraTemplateLinksExperimentEnabled,
	TemplateClickSource,
	trackTemplatesClick,
} from '@/experiments/utils';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon, N8nLink } from '@n8n/design-system';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';

const nodeCreatorStore = useNodeCreatorStore();
const chatPanelStore = useChatPanelStore();
const i18n = useI18n();
const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();
const router = useRouter();
const assistantStore = useAssistantStore();

const isChatWindowOpen = computed(
	() => chatPanelStore.isOpen && chatPanelStore.isBuilderModeActive,
);

const templatesLinkEnabled = computed(() => {
	return isExtraTemplateLinksExperimentEnabled() && settingsStore.isTemplatesEnabled;
});

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
	assistantStore.trackUserOpenedAssistant({
		source: 'build_with_ai',
		task: 'placeholder',
		has_existing_session: !assistantStore.isSessionEnded,
	});
	await chatPanelStore.toggle({ mode: 'builder' });
}

async function onClickTemplatesLink() {
	trackTemplatesClick(TemplateClickSource.emptyWorkflowLink);
	if (templatesStore.hasCustomTemplatesHost) {
		await router.push({ name: VIEWS.TEMPLATES });
		return;
	}

	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank');
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
				<N8nLink
					v-if="templatesLinkEnabled"
					:underline="true"
					size="small"
					data-test-id="canvas-template-link"
					@click="onClickTemplatesLink"
				>
					{{ i18n.baseText('nodeView.templateLink') }}
				</N8nLink>
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
	align-items: flex-start;
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
		box-shadow: 0 0 0 7px var(--canvas--color--selected);
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
	display: flex;
	flex-direction: column;
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
