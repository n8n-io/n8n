<script lang="ts" setup>
import { computed, ref, useCssModule, watch } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import type { CanvasNodeDefaultRender } from '@/types';
import { useCanvas } from '@/composables/useCanvas';
import { calculateNodeSize } from '@/utils/nodeViewUtils';
import ExperimentalInPlaceNodeSettings from '@/components/canvas/experimental/components/ExperimentalEmbeddedNodeDetails.vue';
import { useExperimentalNdvStore } from '@/components/canvas/experimental/experimentalNdv.store';

const $style = useCssModule();
const i18n = useI18n();

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
	activate: [id: string, event: MouseEvent];
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
	isReadOnly,
	isSelected,
	hasPinnedData,
	executionStatus,
	executionWaiting,
	executionWaitingForNext,
	executionRunning,
	hasRunData,
	hasIssues,
	render,
} = useCanvasNode();
const { mainOutputs, mainOutputConnections, mainInputs, mainInputConnections, nonMainInputs } =
	useNodeConnections({
		inputs,
		outputs,
		connections,
	});

const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);

const experimentalNdvStore = useExperimentalNdvStore();

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: isSelected.value,
		[$style.disabled]: isDisabled.value,
		[$style.success]: hasRunData.value,
		[$style.error]: hasIssues.value,
		[$style.pinned]: hasPinnedData.value,
		[$style.waiting]: executionWaiting.value ?? executionStatus.value === 'waiting',
		[$style.running]: executionRunning.value || executionWaitingForNext.value,
		[$style.configurable]: renderOptions.value.configurable,
		[$style.configuration]: renderOptions.value.configuration,
		[$style.trigger]: renderOptions.value.trigger,
		[$style.warning]: renderOptions.value.dirtiness !== undefined,
	};
});

const iconSize = computed(() => (renderOptions.value.configuration ? 30 : 40));

const nodeSize = computed(() =>
	calculateNodeSize(
		renderOptions.value.configuration ?? false,
		renderOptions.value.configurable ?? false,
		mainInputs.value.length,
		mainOutputs.value.length,
		nonMainInputs.value.length,
	),
);

const styles = computed(() => ({
	'--canvas-node--width': `${nodeSize.value.width}px`,
	'--canvas-node--height': `${nodeSize.value.height}px`,
	'--node-icon-size': `${iconSize.value}px`,
}));

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

function onActivate(event: MouseEvent) {
	emit('activate', id.value, event);
}
</script>

<template>
	<ExperimentalInPlaceNodeSettings
		v-if="experimentalNdvStore.isActive(viewport.zoom)"
		:node-id="id"
		:class="classes"
		:style="styles"
		:is-read-only="isReadOnly"
		:is-configurable="renderOptions.configurable ?? false"
	/>
	<div
		v-else
		:class="classes"
		:style="styles"
		:data-test-id="dataTestId"
		@contextmenu="openContextMenu"
		@dblclick.stop="onActivate"
	>
		<CanvasNodeTooltip v-if="renderOptions.tooltip" :visible="showTooltip" />
		<NodeIcon
			:icon-source="iconSource"
			:size="iconSize"
			:shrink="false"
			:disabled="isDisabled"
			:class="$style.icon"
		/>
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
		<CanvasNodeStatusIcons v-if="!isDisabled" :class="$style.statusIcons" />
	</div>
</template>

<style lang="scss" module>
.node {
	--canvas-node-border-width: 2px;
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
		background: var(--canvas-node--background, var(--node-type-supplemental-background));
		border: var(--canvas-node-border-width) solid
			var(--canvas-node--border-color, var(--color-foreground-dark));
		border-radius: calc(var(--canvas-node--height) / 2);

		.statusIcons {
			right: unset;
		}
	}

	&.configurable {
		.icon {
			margin-left: calc(40px - (var(--node-icon-size)) / 2 - var(--canvas-node-border-width));
		}

		.description {
			top: unset;
			position: relative;
			margin-top: 0;
			margin-left: var(--spacing-s);
			margin-right: var(--spacing-s);
			width: auto;
			min-width: unset;
			overflow: hidden;
			text-overflow: ellipsis;
			flex-grow: 1;
			flex-shrink: 1;
		}

		.label {
			text-align: left;
		}

		.subtitle {
			text-align: left;
		}

		&.configuration {
			.icon {
				// 4px represents calc(var(--handle--indicator--width) - configuration node offset) / 2)
				margin-left: calc((var(--canvas-node--height) - var(--node-icon-size) - 4px) / 2);
			}

			&:not(.running) {
				.statusIcons {
					position: static;
					margin-right: var(--spacing-2xs);
				}
			}

			.description {
				margin-right: var(--spacing-xs);
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
		--canvas-node--border-color: var(
			--color-canvas-node-success-border-color,
			var(--color-success)
		);
	}

	&.warning {
		--canvas-node--border-color: var(--color-warning);
	}

	&.error {
		--canvas-node--border-color: var(--color-canvas-node-error-border-color, var(--color-danger));
	}

	&.pinned {
		--canvas-node--border-color: var(
			--color-canvas-node-pinned-border-color,
			var(--color-node-pinned-border)
		);
	}

	&.disabled {
		--canvas-node--border-color: var(
			--color-canvas-node-disabled-border-color,
			var(--color-foreground-base)
		);
	}

	&.running {
		background-color: var(--color-node-executing-background);
		--canvas-node--border-color: var(
			--color-canvas-node-running-border-color,
			var(--color-node-running-border)
		);
	}

	&.waiting {
		--canvas-node--border-color: var(
			--color-canvas-node-waiting-border-color,
			var(--color-secondary)
		);
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
	pointer-events: none;
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

.icon {
	flex-grow: 0;
	flex-shrink: 0;
}
</style>
