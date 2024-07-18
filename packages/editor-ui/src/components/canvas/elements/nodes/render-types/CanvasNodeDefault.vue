<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { useI18n } from '@/composables/useI18n';
import CanvasNodeDisabledStrikeThrough from './parts/CanvasNodeDisabledStrikeThrough.vue';
import CanvasNodeStatusIcons from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeStatusIcons.vue';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS } from '@/constants';
import { N8nTooltip } from 'n8n-design-system';
import type { CanvasNodeDefaultRender } from '@/types';

const $style = useCssModule();
const i18n = useI18n();

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
}>();

const {
	label,
	inputs,
	outputs,
	connections,
	isDisabled,
	isSelected,
	hasPinnedData,
	executionRunning,
	hasRunData,
	hasIssues,
	render,
} = useCanvasNode();
const { mainOutputs, nonMainInputs, requiredNonMainInputs } = useNodeConnections({
	inputs,
	outputs,
	connections,
});

const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: isSelected.value,
		[$style.disabled]: isDisabled.value,
		[$style.success]: hasRunData.value,
		[$style.error]: hasIssues.value,
		[$style.pinned]: hasPinnedData.value,
		[$style.running]: executionRunning.value,
		[$style.configurable]: renderOptions.value.configurable,
		[$style.configuration]: renderOptions.value.configuration,
		[$style.trigger]: renderOptions.value.trigger,
	};
});

const styles = computed(() => {
	const stylesObject: Record<string, string | number> = {};

	if (renderOptions.value.configurable && requiredNonMainInputs.value.length > 0) {
		let spacerCount = 0;
		if (NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS) {
			const requiredNonMainInputsCount = requiredNonMainInputs.value.length;
			const optionalNonMainInputsCount = nonMainInputs.value.length - requiredNonMainInputsCount;
			spacerCount = requiredNonMainInputsCount > 0 && optionalNonMainInputsCount > 0 ? 1 : 0;
		}

		stylesObject['--configurable-node--input-count'] = nonMainInputs.value.length + spacerCount;
	}

	stylesObject['--canvas-node--main-output-count'] = mainOutputs.value.length;

	return stylesObject;
});

const dataTestId = computed(() => {
	let type = 'default';
	if (renderOptions.value.configurable) {
		type = 'configurable';
	} else if (renderOptions.value.configuration) {
		type = 'configuration';
	} else if (renderOptions.value.trigger) {
		type = 'trigger';
	}

	return `canvas-${type}-node`;
});

function openContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}
</script>

<template>
	<div :class="classes" :style="styles" :data-test-id="dataTestId" @contextmenu="openContextMenu">
		<slot />
		<N8nTooltip v-if="renderOptions.trigger" placement="bottom">
			<template #content>
				<span v-html="$locale.baseText('node.thisIsATriggerNode')" />
			</template>
			<div :class="$style.triggerIcon">
				<FontAwesomeIcon icon="bolt" size="lg" />
			</div>
		</N8nTooltip>
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
	--canvas-node--height: calc(96px + max(0, var(--canvas-node--main-output-count, 1) - 4) * 48px);
	--canvas-node--width: 96px;
	--canvas-node-border-width: 2px;
	--configurable-node--min-input-count: 4;
	--configurable-node--input-width: 64px;
	--configurable-node--icon-offset: 40px;
	--configurable-node--icon-size: 30px;
	--trigger-node--border-radius: 36px;

	height: var(--canvas-node--height);
	width: var(--canvas-node--width);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-node-background));
	border: var(--canvas-node-border-width) solid
		var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);

	&.trigger {
		border-radius: var(--trigger-node--border-radius) var(--border-radius-large)
			var(--border-radius-large) var(--trigger-node--border-radius);
	}

	/**
	 * Node types
	 */

	&.configuration {
		--canvas-node--width: 76px;
		--canvas-node--height: 76px;

		background: var(--canvas-node--background, var(--node-type-supplemental-background));
		border: var(--canvas-node-border-width) solid
			var(--canvas-node--border-color, var(--color-foreground-dark));
		border-radius: 50px;

		.statusIcons {
			right: unset;
		}
	}

	&.configurable {
		--canvas-node--height: 96px;
		--canvas-node--width: calc(
			max(var(--configurable-node--input-count, 5), var(--configurable-node--min-input-count)) *
				var(--configurable-node--input-width)
		);

		.label {
			top: unset;
			position: relative;
			margin-left: var(--spacing-s);
			width: auto;
			min-width: unset;
			max-width: calc(
				var(--canvas-node--width) - var(--configurable-node--icon-offset) - var(
						--configurable-node--icon-size
					) - 2 * var(--spacing-s)
			);
		}
	}

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

	&.running {
		background-color: var(--color-node-executing-background);
		border-color: var(--color-canvas-node-running-border-color, var(--color-node-running-border));
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
	bottom: var(--spacing-2xs);
	right: var(--spacing-2xs);
}

.triggerIcon {
	position: absolute;
	right: 100%;
	margin: auto;
	color: var(--color-primary);
	padding: var(--spacing-2xs);
}
</style>
