<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { useI18n } from '@/composables/useI18n';
import CanvasNodeDisabledStrikeThrough from './parts/CanvasNodeDisabledStrikeThrough.vue';
import CanvasNodeStatusIcons from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeStatusIcons.vue';
import { useCanvasNode } from '@/composables/useCanvasNode';

const $style = useCssModule();
const i18n = useI18n();

const {
	label,
	inputs,
	outputs,
	connections,
	isDisabled,
	isSelected,
	hasPinnedData,
	hasRunData,
	hasIssues,
} = useCanvasNode();
const { mainOutputs } = useNodeConnections({
	inputs,
	outputs,
	connections,
});

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: isSelected.value,
		[$style.disabled]: isDisabled.value,
		[$style.success]: hasRunData.value,
		[$style.error]: hasIssues.value,
		[$style.pinned]: hasPinnedData.value,
	};
});

const styles = computed(() => {
	return {
		'--node-main-output-count': mainOutputs.value.length,
	};
});
</script>

<template>
	<div :class="classes" :style="styles" data-test-id="canvas-node-default">
		<slot />
		<CanvasNodeStatusIcons :class="$style.statusIcons" />
		<CanvasNodeDisabledStrikeThrough v-if="isDisabled" />
		<div v-if="label" :class="$style.label">
			{{ label }}
			<div v-if="isDisabled">({{ i18n.baseText('node.disabled') }})</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.node {
	--canvas-node--height: calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 50px);
	--canvas-node--width: 100px;

	height: var(--canvas-node--height);
	width: var(--canvas-node--width);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);

	/**
	 * State classes
	 * The reverse order defines the priority in case multiple states are active
	 */

	&.selected {
		box-shadow: 0 0 0 4px var(--color-canvas-selected);
	}

	&.success {
		border-color: var(--color-canvas-node-success-border-color, var(--color-success));
	}

	&.error {
		border-color: var(--color-canvas-node-error-border-color, var(--color-danger));
	}

	&.pinned {
		border-color: var(--color-canvas-node-pinned-border-color, var(--color-node-pinned-border));
	}

	&.disabled {
		border-color: var(--color-canvas-node-disabled-border-color, var(--color-foreground-base));
	}
}

.label {
	top: 100%;
	position: absolute;
	font-size: var(--font-size-m);
	text-align: center;
	width: 100%;
	min-width: 200px;
	margin-top: var(--spacing-2xs);
}

.statusIcons {
	position: absolute;
	top: calc(var(--canvas-node--height) - 24px);
	right: var(--spacing-xs);
}
</style>
