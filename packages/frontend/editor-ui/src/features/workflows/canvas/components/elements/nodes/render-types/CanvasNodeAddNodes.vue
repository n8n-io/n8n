<script setup lang="ts">
import {
	NODE_CREATOR_OPEN_SOURCES,
	VIEWS,
	EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY,
} from '@/app/constants';
import { nodeViewEventBus } from '@/app/event-bus';
import {
	isExtraTemplateLinksExperimentEnabled,
	TemplateClickSource,
	trackTemplatesClick,
} from '@/experiments/utils';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon, N8nLink, N8nTooltip } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { useTemplatesDataQualityStore } from '@/experiments/templatesDataQuality/stores/templatesDataQuality.store';
const nodeCreatorStore = useNodeCreatorStore();
const i18n = useI18n();
const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();
const router = useRouter();
const uiStore = useUIStore();
const templatesDataQualityStore = useTemplatesDataQualityStore();
const isTooltipVisible = ref(false);

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

async function onClickTemplatesLink() {
	trackTemplatesClick(TemplateClickSource.emptyWorkflowLink);
	if (templatesStore.hasCustomTemplatesHost) {
		await router.push({ name: VIEWS.TEMPLATES });
		return;
	}

	if (templatesDataQualityStore.isFeatureEnabled()) {
		uiStore.openModal(EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY);
		return;
	}

	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank');
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
				:underline="true"
				size="small"
				data-test-id="canvas-template-link"
				@click="onClickTemplatesLink"
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
		fill: var(--color--primary);
	}
}

.button {
	background: var(--color--foreground--tint-2);
	border: 2px dashed var(--color--foreground--shade-2);
	border-radius: 8px;
	padding: 0;

	min-width: 100px;
	min-height: 100px;
	cursor: pointer;
}

.label {
	width: max-content;
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	color: var(--color--text--shade-1);
	margin-top: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
}
</style>
