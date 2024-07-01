<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useI18n } from '@/composables/useI18n';
import CanvasNodeStatusIcons from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeStatusIcons.vue';
import { useCanvasNode } from '@/composables/useCanvasNode';

const $style = useCssModule();
const i18n = useI18n();

const { label, isDisabled, isSelected, hasIssues } = useCanvasNode();

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: isSelected.value,
		[$style.disabled]: isDisabled.value,
		[$style.error]: hasIssues.value,
	};
});
</script>

<template>
	<div :class="classes" data-test-id="canvas-node-configuration">
		<slot />
		<CanvasNodeStatusIcons :class="$style.statusIcons" />
		<div v-if="label" :class="$style.label">
			{{ label }}
			<div v-if="isDisabled">({{ i18n.baseText('node.disabled') }})</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.node {
	--canvas-node--width: 75px;
	--canvas-node--height: 75px;

	width: var(--canvas-node--width);
	height: var(--canvas-node--height);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--node-type-supplemental-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-dark));
	border-radius: 50%;

	/**
	 * State classes
	 * The reverse order defines the priority in case multiple states are active
	 */

	&.selected {
		box-shadow: 0 0 0 4px var(--color-canvas-selected);
	}

	&.error {
		border-color: var(--color-canvas-node-error-border-color, var(--color-danger));
	}

	&.disabled {
		border-color: var(--color-canvas-node-disabled-border, var(--color-foreground-base));
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
}
</style>
