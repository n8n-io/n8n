<script setup lang="ts">
import { useCssModule } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useCanvasNode } from '@/composables/useCanvasNode';

const emit = defineEmits<{
	delete: [];
	toggle: [];
	run: [];
}>();

const $style = useCssModule();
const i18n = useI18n();

const { renderOptions } = useCanvasNode();

// @TODO
const workflowRunning = false;

// @TODO
const nodeDisabledTitle = 'Test';

function executeNode() {
	emit('run');
}

function onToggleNode() {
	emit('toggle');
}

function onDeleteNode() {
	emit('delete');
}

// @TODO
function openContextMenu(_e: MouseEvent, _type: string) {}
</script>

<template>
	<div :class="$style.canvasNodeToolbar">
		<div :class="$style.canvasNodeToolbarItems">
			<N8nIconButton
				v-if="!renderOptions.configuration"
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
				data-test-id="disable-node-button"
				type="tertiary"
				text
				size="small"
				icon="power-off"
				:title="nodeDisabledTitle"
				@click="onToggleNode"
			/>
			<N8nIconButton
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
				@click="(e: MouseEvent) => openContextMenu(e, 'node-button')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvasNodeToolbar {
	padding-bottom: var(--spacing-2xs);
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
