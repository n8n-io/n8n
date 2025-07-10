<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, useCssModule } from 'vue';
import type { NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

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
		<N8nIconButton
			v-if="isAddButtonVisible"
			class="canvas-edge-toolbar-button"
			data-test-id="add-connection-button"
			type="tertiary"
			size="small"
			icon-size="medium"
			icon="plus"
			:title="i18n.baseText('node.add')"
			@click="onAdd"
		/>
		<N8nIconButton
			data-test-id="delete-connection-button"
			class="canvas-edge-toolbar-button"
			type="tertiary"
			size="small"
			icon-size="medium"
			icon="trash-2"
			:title="i18n.baseText('node.delete')"
			@click="onDelete"
		/>
	</div>
</template>

<style lang="scss" module>
.canvasEdgeToolbar {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing-2xs);
	pointer-events: all;
	padding: var(--spacing-2xs);
}
</style>

<style lang="scss">
@mixin dark-button-styles {
	--button-background-color: var(--color-background-base);
	--button-hover-background-color: var(--color-background-light);
}

@media (prefers-color-scheme: dark) {
	body:not([data-theme]) .canvas-edge-toolbar-button {
		@include dark-button-styles();
	}
}

[data-theme='dark'] .canvas-edge-toolbar-button {
	@include dark-button-styles();
}

.canvas-edge-toolbar-button {
	border-width: 2px;
}
</style>
