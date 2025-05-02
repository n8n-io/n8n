<script lang="ts" setup>
import { computed, ref, useCssModule, watch } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { useI18n } from '@/composables/useI18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS } from '@/constants';
import type { CanvasNodeDefaultRender } from '@/types';
import { useCanvas } from '@/composables/useCanvas';

const $style = useCssModule();
const i18n = useI18n();

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
	activate: [id: string];
}>();

const { initialized, viewport } = useCanvas();
const {
	id,
	label,
	subtitle,
	inputs,
	outputs,
	connections,
	isDisabled,
	isSelected,
	hasPinnedData,
	executionStatus,
	executionWaiting,
	executionRunning,
	hasRunData,
	hasIssues,
	render,
} = useCanvasNode();
const {
	mainOutputs,
	mainOutputConnections,
	mainInputs,
	mainInputConnections,
	nonMainInputs,
	requiredNonMainInputs,
} = useNodeConnections({
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
		[$style.waiting]: executionWaiting.value ?? executionStatus.value === 'waiting',
		[$style.running]: executionRunning.value,
		[$style.configurable]: renderOptions.value.configurable,
		[$style.configuration]: renderOptions.value.configuration,
		[$style.trigger]: renderOptions.value.trigger,
		[$style.warning]: renderOptions.value.dirtiness !== undefined,
	};
});

const styles = computed(() => {
	const stylesObject: Record<string, string | number> = {};

	if (renderOptions.value.configurable) {
		let spacerCount = 0;
		if (NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS && requiredNonMainInputs.value.length > 0) {
			const requiredNonMainInputsCount = requiredNonMainInputs.value.length;
			const optionalNonMainInputsCount = nonMainInputs.value.length - requiredNonMainInputsCount;
			spacerCount = requiredNonMainInputsCount > 0 && optionalNonMainInputsCount > 0 ? 1 : 0;
		}

		stylesObject['--configurable-node--input-count'] = nonMainInputs.value.length + spacerCount;
	}

	stylesObject['--canvas-node--main-input-count'] = mainInputs.value.length;
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

const isStrikethroughVisible = computed(() => {
	const isSingleMainInputNode =
		mainInputs.value.length === 1 && mainInputConnections.value.length <= 1;
	const isSingleMainOutputNode =
		mainOutputs.value.length === 1 && mainOutputConnections.value.length <= 1;

	return isDisabled.value && isSingleMainInputNode && isSingleMainOutputNode;
});

const iconSize = computed(() => (renderOptions.value.configuration ? 30 : 40));

const iconSource = computed(() => renderOptions.value.icon);

const showTooltip = ref(false);

watch(initialized, () => {
	if (initialized.value) {
		showTooltip.value = true;
	}
});

watch(viewport, () => {
	showTooltip.value = false;
	setTimeout(() => {
		showTooltip.value = true;
	}, 0);
});

function openContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

function onActivate() {
	emit('activate', id.value);
}
</script>

<template>
	<div
		:class="classes"
		:style="styles"
		:data-test-id="dataTestId"
		@contextmenu="openContextMenu"
		@dblclick.stop="onActivate"
	>
		<CanvasNodeTooltip v-if="renderOptions.tooltip" :visible="showTooltip" />
		<NodeIcon :icon-source="iconSource" :size="iconSize" :shrink="false" :disabled="isDisabled" />
		<CanvasNodeStatusIcons v-if="!isDisabled" :class="$style.statusIcons" />
		<CanvasNodeDisabledStrikeThrough v-if="isStrikethroughVisible" />
		<div :class="$style.description">
			<div v-if="label" :class="$style.label">
				{{ label }}
			</div>
			<div v-if="isDisabled" :class="$style.disabledLabel">
				({{ i18n.baseText('node.disabled') }})
			</div>
			<div v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.node {
	--canvas-node--max-vertical-handles: max(
		var(--canvas-node--main-input-count),
		var(--canvas-node--main-output-count),
		1
	);
	--canvas-node--height: calc(100px + max(0, var(--canvas-node--max-vertical-handles) - 3) * 42px);
	--canvas-node--width: 100px;
	--canvas-node-border-width: 2px;
	--configurable-node--min-input-count: 4;
	--configurable-node--input-width: 64px;
	--configurable-node--icon-offset: 30px;
	--configurable-node--icon-size: 30px;
	--trigger-node--border-radius: 36px;
	--canvas-node--status-icons-offset: var(--spacing-3xs);
	--node-icon-color: var(--color-foreground-dark);

	position: relative;
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
		--canvas-node--width: 80px;
		--canvas-node--height: 80px;

		background: var(--canvas-node--background, var(--node-type-supplemental-background));
		border: var(--canvas-node-border-width) solid
			var(--canvas-node--border-color, var(--color-foreground-dark));
		border-radius: 50px;

		.statusIcons {
			right: unset;
		}
	}

	&.configurable {
		--canvas-node--height: 100px;
		--canvas-node--width: calc(
			max(var(--configurable-node--input-count, 4), var(--configurable-node--min-input-count)) *
				var(--configurable-node--input-width)
		);

		justify-content: flex-start;

		:global(.n8n-node-icon) {
			margin-left: var(--configurable-node--icon-offset);
		}

		.description {
			top: unset;
			position: relative;
			margin-top: 0;
			margin-left: var(--spacing-s);
			margin-right: var(--spacing-s);
			width: auto;
			min-width: unset;
			max-width: calc(
				var(--canvas-node--width) - var(--configurable-node--icon-offset) - var(
						--configurable-node--icon-size
					) - 2 * var(--spacing-s)
			);
		}

		.label {
			text-align: left;
		}

		.subtitle {
			text-align: left;
		}

		&.configuration {
			--canvas-node--height: 75px;

			.statusIcons {
				right: calc(-1 * var(--spacing-2xs));
				bottom: 0;
			}
		}
	}

	/**
	 * State classes
	 * The reverse order defines the priority in case multiple states are active
	 */

	&.selected {
		box-shadow: 0 0 0 8px var(--color-canvas-selected-transparent);
	}

	&.success {
		border-color: var(--color-canvas-node-success-border-color, var(--color-success));
	}

	&.warning {
		border-color: var(--color-warning);
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

	&.waiting {
		border-color: var(--color-canvas-node-waiting-border-color, var(--color-secondary));
	}
}

.description {
	top: 100%;
	position: absolute;
	width: 100%;
	min-width: calc(var(--canvas-node--width) * 2);
	margin-top: var(--spacing-2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);
	align-items: center;
}

.label,
.disabledLabel {
	font-size: var(--font-size-m);
	text-align: center;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	overflow-wrap: anywhere;
	font-weight: var(--font-weight-medium);
	line-height: var(--font-line-height-compact);
}

.subtitle {
	width: 100%;
	text-align: center;
	color: var(--color-text-light);
	font-size: var(--font-size-xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--font-line-height-compact);
	font-weight: var(--font-weight-regular);
}

.statusIcons {
	position: absolute;
	bottom: var(--canvas-node--status-icons-offset);
	right: var(--canvas-node--status-icons-offset);
}
</style>
