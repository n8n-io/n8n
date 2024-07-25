<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { CanvasNodeRenderType } from '@/types';

const emit = defineEmits<{
	delete: [];
	toggle: [];
	run: [];
	'open:contextmenu': [event: MouseEvent];
}>();

const props = defineProps<{
	readOnly?: boolean;
}>();

const $style = useCssModule();
const i18n = useI18n();

const { render } = useCanvasNode();

// @TODO
const workflowRunning = false;

// @TODO
const nodeDisabledTitle = 'Test';

const classes = computed(() => ({
	[$style.canvasNodeToolbar]: true,
	[$style.readOnly]: props.readOnly,
}));

const isExecuteNodeVisible = computed(() => {
	return (
		!props.readOnly &&
		render.value.type === CanvasNodeRenderType.Default &&
		'configuration' in render.value.options &&
		!render.value.options.configuration
	);
});

const isDisableNodeVisible = computed(() => {
	return !props.readOnly && render.value.type === CanvasNodeRenderType.Default;
});

const isDeleteNodeVisible = computed(() => !props.readOnly);

function executeNode() {
	emit('run');
}

function onToggleNode() {
	emit('toggle');
}

function onDeleteNode() {
	emit('delete');
}

function onOpenContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}
</script>

<template>
	<div :class="classes">
		<div :class="$style.canvasNodeToolbarItems">
			<N8nIconButton
				v-if="isExecuteNodeVisible"
				data-test-id="execute-node-button"
				type="tertiary"
				text
				size="small"
				icon="play"
				:disabled="workflowRunning"
				:title="i18n.baseText('node.testStep')"
				@click="executeNode"
			/>
			<N8nIconButton
				v-if="isDisableNodeVisible"
				data-test-id="disable-node-button"
				type="tertiary"
				text
				size="small"
				icon="power-off"
				:title="nodeDisabledTitle"
				@click="onToggleNode"
			/>
			<N8nIconButton
				v-if="isDeleteNodeVisible"
				data-test-id="delete-node-button"
				type="tertiary"
				size="small"
				text
				icon="trash"
				:title="i18n.baseText('node.delete')"
				@click="onDeleteNode"
			/>
			<N8nIconButton
				data-test-id="overflow-node-button"
				type="tertiary"
				size="small"
				text
				icon="ellipsis-h"
				@click="onOpenContextMenu"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvasNodeToolbar {
	padding-bottom: var(--spacing-2xs);
	display: flex;
	justify-content: flex-end;
	width: 100%;
}

.canvasNodeToolbarItems {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color-canvas-background);

	:global(.button) {
		--button-font-color: var(--color-text-light);
	}
}
</style>
