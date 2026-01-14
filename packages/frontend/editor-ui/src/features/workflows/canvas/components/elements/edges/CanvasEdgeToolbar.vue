<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, useCssModule } from 'vue';
import type { NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { N8nIconButton } from '@n8n/design-system';
import CanvasEdgeTooltip from './CanvasEdgeTooltip.vue';

const emit = defineEmits<{
	add: [];
	delete: [];
}>();

const props = defineProps<{
	type: NodeConnectionType;
}>();

const $style = useCssModule();

const i18n = useI18n();

const classes = computed(() => ({
	[$style.canvasEdgeToolbar]: true,
}));

const isAddButtonVisible = computed(() => props.type === NodeConnectionTypes.Main);

function onAdd() {
	emit('add');
}

function onDelete() {
	emit('delete');
}
</script>

<template>
	<div :class="classes" data-test-id="canvas-edge-toolbar">
		<CanvasEdgeTooltip v-if="isAddButtonVisible" :content="i18n.baseText('node.add')">
			<N8nIconButton
				class="canvas-edge-toolbar-button"
				data-test-id="add-connection-button"
				type="tertiary"
				size="small"
				icon-size="medium"
				icon="plus"
				@click="onAdd"
			/>
		</CanvasEdgeTooltip>
		<CanvasEdgeTooltip :content="i18n.baseText('node.delete')">
			<N8nIconButton
				data-test-id="delete-connection-button"
				class="canvas-edge-toolbar-button"
				type="tertiary"
				size="small"
				icon-size="medium"
				icon="trash-2"
				@click="onDelete"
			/>
		</CanvasEdgeTooltip>
	</div>
</template>

<style lang="scss" module>
.canvasEdgeToolbar {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--2xs);
	pointer-events: all;
	padding: var(--spacing--2xs);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: scale(var(--canvas-zoom-compensation-factor, 1));
}
</style>

<style lang="scss">
.canvas-edge-toolbar-button {
	border-width: 0;
	--button--color--text: light-dark(var(--color--neutral-700), var(--color--neutral-250));
	--button--color--text--hover: light-dark(var(--color--neutral-850), var(--color--neutral-150));
	--button--color--background: light-dark(var(--color--neutral-200), var(--color--neutral-850));
	--button--color--background--hover: light-dark(
		var(--color--neutral-250),
		var(--color--neutral-800)
	);
}
</style>
