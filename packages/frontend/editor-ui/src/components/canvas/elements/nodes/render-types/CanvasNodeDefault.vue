<script lang="ts" setup>
import { computed, ref, useCssModule, watch } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import type { CanvasNodeDefaultRender } from '@/types';
import { useCanvas } from '@/composables/useCanvas';
import { useNodeSettingsInCanvas } from '@/components/canvas/composables/useNodeSettingsInCanvas';
import { calculateNodeSize } from '@/utils/nodeViewUtils';
import ExperimentalCanvasNodeSettings from '../../../components/ExperimentalCanvasNodeSettings.vue';

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

const nodeSettingsZoom = useNodeSettingsInCanvas();

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
		[$style.settingsView]: nodeSettingsZoom.value !== undefined,
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
	...(nodeSettingsZoom.value === undefined ? {} : { '--zoom': nodeSettingsZoom.value }),
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
	<div
		:class="classes"
		:style="styles"
		:data-test-id="dataTestId"
		@contextmenu="openContextMenu"
		@dblclick.stop="onActivate"
	>
		<ExperimentalCanvasNodeSettings v-if="nodeSettingsZoom !== undefined" :node-id="id" />
		<template v-else>
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
		</template>
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

	&.settingsView {
		height: calc(var(--canvas-node--height) * 2.4) !important;
		width: calc(var(--canvas-node--width) * 1.6) !important;
		align-items: flex-start;
		justify-content: stretch;
		overflow: auto;
		border-radius: var(--border-radius-large) !important;

		& > * {
			zoom: calc(1 / var(--zoom, 1));
			width: 100% !important;
		}
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
				margin-left: calc((var(--canvas-node--height) - var(--node-icon-size)) / 2);
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
