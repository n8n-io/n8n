<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS } from '@/constants';
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
const { nonMainInputs, requiredNonMainInputs } = useNodeConnections({
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
	const stylesObject: {
		[key: string]: string | number;
	} = {};

	if (requiredNonMainInputs.value.length > 0) {
		let spacerCount = 0;
		if (NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS) {
			const requiredNonMainInputsCount = requiredNonMainInputs.value.length;
			const optionalNonMainInputsCount = nonMainInputs.value.length - requiredNonMainInputsCount;
			spacerCount = requiredNonMainInputsCount > 0 && optionalNonMainInputsCount > 0 ? 1 : 0;
		}

		stylesObject['--configurable-node-input-count'] = nonMainInputs.value.length + spacerCount;
	}

	return stylesObject;
});
</script>

<template>
	<div :class="classes" :style="styles" data-test-id="canvas-node-configurable">
		<slot />
		<CanvasNodeStatusIcons :class="$style.statusIcons" />
		<CanvasNodeDisabledStrikeThrough v-if="isDisabled" />
		<div :class="$style.label">
			{{ label }}
			<div v-if="isDisabled">({{ i18n.baseText('node.disabled') }})</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.node {
	--configurable-node-min-input-count: 4;
	--configurable-node-input-width: 65px;
	--canvas-node--height: 100px;
	--canvas-node--width: calc(
		max(var(--configurable-node-input-count, 5), var(--configurable-node-min-input-count)) *
			var(--configurable-node-input-width)
	);

	width: var(--canvas-node--width);
	height: var(--canvas-node--height);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);

	&.selected {
		box-shadow: 0 0 0 4px var(--color-canvas-selected);
	}

	/**
	 * State classes
	 * The reverse order defines the priority in case multiple states are active
	 */

	&.error {
		border-color: var(--color-canvas-node-error-border-color, var(--color-danger));
	}

	&.success {
		border-color: var(--color-canvas-node-success-border-color, var(--color-success));
	}

	&.pinned {
		border-color: var(--color-canvas-node-pinned-border, var(--color-node-pinned-border));
	}

	&.disabled {
		border-color: var(--color-canvas-node-disabled-border, var(--color-foreground-base));
	}
}

.label {
	top: 100%;
	font-size: var(--font-size-m);
	text-align: center;
	margin-left: var(--spacing-s);
	max-width: calc(
		var(--node-width) - var(--configurable-node-icon-offset) - var(--configurable-node-icon-size) -
			2 * var(--spacing-s)
	);
}

.statusIcons {
	position: absolute;
	top: calc(var(--canvas-node--height) - 24px);
	right: var(--spacing-xs);
}
</style>
