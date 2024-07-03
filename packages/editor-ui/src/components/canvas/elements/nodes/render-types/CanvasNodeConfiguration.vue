<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { CanvasNodeKey } from '@/constants';
import { useI18n } from '@/composables/useI18n';

const node = inject(CanvasNodeKey);

const $style = useCssModule();
const i18n = useI18n();

const label = computed(() => node?.label.value ?? '');

const isDisabled = computed(() => node?.data.value.disabled ?? false);

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: node?.selected.value,
		[$style.disabled]: isDisabled.value,
	};
});
</script>

<template>
	<div :class="classes" data-test-id="canvas-node-configuration">
		<slot />
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

.selected {
	box-shadow: 0 0 0 4px var(--color-canvas-selected);
}

.disabled {
	border-color: var(--color-canvas-node-disabled-border, var(--color-foreground-base));
}
</style>
