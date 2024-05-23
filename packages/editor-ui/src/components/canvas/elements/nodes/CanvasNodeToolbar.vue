<script setup lang="ts">
import { computed, inject, useCssModule } from 'vue';
import { CanvasNodeKey } from '@/constants';

const node = inject(CanvasNodeKey);

const data = computed(() => node?.data.value);

const $style = useCssModule();

// @TODO
const workflowRunning = false;

// @TODO
const nodeDisabledTitle = 'Test';

// @TODO
function executeNode() {}

// @TODO
function toggleDisableNode() {}

// @TODO
function deleteNode() {}

// @TODO
function openContextMenu(e: MouseEvent, type: string) {}
</script>

<template>
	<div :class="$style.canvasNodeToolbar">
		<div :class="$style.canvasNodeToolbarItems">
			<N8nIconButton
				v-if="data?.renderType !== 'configuration'"
				data-test-id="execute-node-button"
				type="tertiary"
				text
				size="small"
				icon="play"
				:disabled="workflowRunning"
				:title="$locale.baseText('node.testStep')"
				@click="executeNode"
			/>
			<N8nIconButton
				data-test-id="disable-node-button"
				type="tertiary"
				text
				size="small"
				icon="power-off"
				:title="nodeDisabledTitle"
				@click="toggleDisableNode"
			/>
			<N8nIconButton
				data-test-id="delete-node-button"
				type="tertiary"
				size="small"
				text
				icon="trash"
				:title="$locale.baseText('node.delete')"
				@click="deleteNode"
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
	padding-bottom: var(--spacing-3xs);
}

.canvasNodeToolbarItems {
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
