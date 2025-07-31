<script setup lang="ts">
import { NODE_CREATOR_OPEN_SOURCES, VIEWS } from '@/constants';
import { nodeViewEventBus } from '@/event-bus';
import {
	isExtraTemplateLinksExperimentEnabled,
	TemplateClickSource,
	trackTemplatesClick,
} from '@/utils/experiments';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const nodeCreatorStore = useNodeCreatorStore();
const i18n = useI18n();
const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();

const isTooltipVisible = ref(false);

const templateRepository = computed(() => {
	if (templatesStore.hasCustomTemplatesHost) {
		return {
			to: { name: VIEWS.TEMPLATES },
		};
	}

	return {
		to: templatesStore.websiteTemplateRepositoryURL,
		target: '_blank',
	};
});

const templatesLinkEnabled = computed(() => {
	return isExtraTemplateLinksExperimentEnabled() && settingsStore.isTemplatesEnabled;
});

onMounted(() => {
	nodeViewEventBus.on('runWorkflowButton:mouseenter', onShowTooltip);
	nodeViewEventBus.on('runWorkflowButton:mouseleave', onHideTooltip);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('runWorkflowButton:mouseenter', onShowTooltip);
	nodeViewEventBus.off('runWorkflowButton:mouseleave', onHideTooltip);
});

function onShowTooltip() {
	isTooltipVisible.value = true;
}

function onHideTooltip() {
	isTooltipVisible.value = false;
}

function onClick() {
	nodeCreatorStore.openNodeCreatorForTriggerNodes(
		NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON,
	);
}
</script>
<template>
	<div ref="container" :class="$style.addNodes" data-test-id="canvas-add-button">
		<N8nTooltip
			placement="top"
			:visible="isTooltipVisible"
			:disabled="nodeCreatorStore.showScrim"
			:popper-class="$style.tooltip"
			:show-after="700"
		>
			<button :class="$style.button" data-test-id="canvas-plus-button" @click.stop="onClick">
				<N8nIcon icon="plus" color="foreground-xdark" :size="40" />
			</button>
			<template #content>
				{{ i18n.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting') }}
			</template>
		</N8nTooltip>
		<p :class="$style.label">
			{{ i18n.baseText('nodeView.canvasAddButton.addFirstStep') }}
			<N8nLink
				v-if="templatesLinkEnabled"
				:to="templateRepository.to"
				:target="templateRepository.target"
				:underline="true"
				size="small"
				data-test-id="canvas-template-link"
				@click="trackTemplatesClick(TemplateClickSource.emptyWorkflowLink)"
			>
				{{ i18n.baseText('nodeView.templateLink') }}
			</N8nLink>
		</p>
	</div>
</template>

<style lang="scss" module>
.addNodes {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100px;
	height: 100px;

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
}

.label {
	width: max-content;
	font-weight: var(--font-weight-medium);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
	color: var(--color-text-dark);
	margin-top: var(--spacing-2xs);
	display: flex;
	flex-direction: column;
}
</style>
