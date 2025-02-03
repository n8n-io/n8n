<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { NODE_CREATOR_OPEN_SOURCES } from '@/constants';
import { nodeViewEventBus } from '@/event-bus';
import { useI18n } from '@/composables/useI18n';

const nodeCreatorStore = useNodeCreatorStore();
const i18n = useI18n();

const isTooltipVisible = ref(false);

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
			<button :class="$style.button" data-test-id="canvas-plus-button" @click="onClick">
				<FontAwesomeIcon icon="plus" size="lg" />
			</button>
			<template #content>
				{{ i18n.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting') }}
			</template>
		</N8nTooltip>
		<p :class="$style.label" v-text="i18n.baseText('nodeView.canvasAddButton.addFirstStep')" />
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

	svg {
		width: 26px !important;
		height: 40px;
		path {
			fill: var(--color-foreground-xdark);
		}
	}
}

.label {
	width: max-content;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
	color: var(--color-text-dark);
	margin-top: var(--spacing-2xs);
}
</style>
