<script lang="ts" setup>
import { computed, ref, useCssModule, watch } from 'vue';
import { useNodeConnections } from '@/app/composables/useNodeConnections';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeDefaultRender } from '../../../../canvas.types';
import { useCanvas } from '../../../../composables/useCanvas';
import { useZoomAdjustedValues } from '../../../../composables/useZoomAdjustedValues';
import CanvasNodeSettingsIcons from './parts/CanvasNodeSettingsIcons.vue';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { calculateNodeSize } from '@/app/utils/nodeViewUtils';
import ExperimentalInPlaceNodeSettings from '../../../../experimental/components/ExperimentalEmbeddedNodeDetails.vue';
import CanvasNodeTooltip from './parts/CanvasNodeTooltip.vue';
import CanvasNodeDisabledStrikeThrough from './parts/CanvasNodeDisabledStrikeThrough.vue';
import CanvasNodeStatusIcons from './parts/CanvasNodeStatusIcons.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';

const $style = useCssModule();
const i18n = useI18n();

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
	activate: [id: string, event: MouseEvent];
}>();

const { initialized, viewport, isExperimentalNdvActive } = useCanvas();
const { calculateNodeBorderOpacity } = useZoomAdjustedValues(viewport);
const route = useRoute();
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
	hasExecutionErrors,
	render,
	isNotInstalledCommunityNode,
} = useCanvasNode();
const { mainOutputs, mainOutputConnections, mainInputs, mainInputConnections, nonMainInputs } =
	useNodeConnections({
		inputs,
		outputs,
		connections,
	});

const nodeHelpers = useNodeHelpers();
const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);
const isDemoRoute = computed(() => route.name === VIEWS.DEMO);

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: isSelected.value,
		[$style.disabled]:
			isDisabled.value || (isNotInstalledCommunityNode.value && !isDemoRoute.value),
		[$style.success]: hasRunData.value && executionStatus.value === 'success',
		[$style.error]: hasExecutionErrors.value,
		[$style.pinned]: hasPinnedData.value,
		[$style.waiting]: executionWaiting.value || executionStatus.value === 'waiting',
		[$style.running]: executionRunning.value || executionWaitingForNext.value,
		[$style.configurable]: renderOptions.value.configurable,
		[$style.configuration]: renderOptions.value.configuration,
		[$style.trigger]: renderOptions.value.trigger,
		[$style.warning]: renderOptions.value.dirtiness !== undefined,
		waiting: executionWaiting.value || executionStatus.value === 'waiting',
		running: executionRunning.value || executionWaitingForNext.value,
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
		isExperimentalNdvActive.value,
	),
);

const nodeBorderOpacity = calculateNodeBorderOpacity();

const styles = computed(() => ({
	'--canvas-node--width': `${nodeSize.value.width}px`,
	'--canvas-node--height': `${nodeSize.value.height}px`,
	'--node--icon--size': `${iconSize.value}px`,
	'--canvas-node--border--opacity-light': nodeBorderOpacity.value.light,
	'--canvas-node--border--opacity-dark': nodeBorderOpacity.value.dark,
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
		v-if="isExperimentalNdvActive"
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
		<CanvasNodeSettingsIcons
			v-if="
				!renderOptions.configuration &&
				!isDisabled &&
				!(hasPinnedData && !nodeHelpers.isProductionExecutionPreview.value)
			"
		/>
		<CanvasNodeDisabledStrikeThrough v-if="isStrikethroughVisible" />
		<div :class="$style.description">
			<div v-if="label" :class="$style.label">
				{{ label }}
			</div>
			<div v-if="isDisabled" :class="$style.disabledLabel">
				({{ i18n.baseText('node.disabled') }})
			</div>
			<div v-if="subtitle && !isNotInstalledCommunityNode" :class="$style.subtitle">
				{{ subtitle }}
			</div>
		</div>
		<CanvasNodeStatusIcons v-if="!isDisabled" :class="$style.statusIcons" />
	</div>
</template>

<style lang="scss" module>
.node {
	--canvas-node--border-width: 1.5px;
	--trigger-node--radius: 36px;
	--canvas-node--status-icons--margin: var(--spacing--3xs);
	--node--icon--color: var(--color--foreground--shade-1);

	position: relative;
	height: var(--canvas-node--height);
	width: var(--canvas-node--width);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--color--background, var(--node--color--background));
	background-clip: padding-box;
	border: var(--canvas-node--border-width) solid
		var(
			--canvas-node--border-color,
			light-dark(
				oklch(
					from var(--color--neutral-black) l c h / var(--canvas-node--border--opacity-light, 0.1)
				),
				oklch(
					from var(--color--neutral-white) l c h / var(--canvas-node--border--opacity-dark, 0.15)
				)
			)
		);
	border-radius: var(--radius--lg);

	&.trigger {
		border-radius: var(--trigger-node--radius) var(--radius--lg) var(--radius--lg)
			var(--trigger-node--radius);

		&.running::after,
		&.waiting::after {
			border-radius: var(--trigger-node--radius) var(--radius--lg) var(--radius--lg)
				var(--trigger-node--radius);
		}
	}

	/**
	 * Node types
	 */

	&.configuration {
		border-radius: calc(var(--canvas-node--height) / 2);

		&.running::after,
		&.waiting::after {
			border-radius: calc(var(--canvas-node--height) / 2);
		}

		.statusIcons {
			right: unset;
		}
	}

	&.configurable {
		.icon {
			margin-left: calc(40px - (var(--node--icon--size)) / 2 - var(--canvas-node--border-width));
		}

		.description {
			top: unset;
			position: relative;
			margin-top: 0;
			margin-left: var(--spacing--sm);
			margin-right: var(--spacing--sm);
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
				margin-left: calc((var(--canvas-node--height) - var(--node--icon--size) - 4px) / 2);
			}

			.statusIcons {
				position: static;
				margin-right: var(--spacing--2xs);
			}

			.description {
				margin-right: var(--spacing--xs);
			}
		}
	}

	/**
	 * State classes
	 * The reverse order defines the priority in case multiple states are active
	 */

	&.selected {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		box-shadow: 0 0 0 calc(6px * var(--canvas-zoom-compensation-factor, 1))
			var(--canvas--color--selected-transparent);
	}

	&.success {
		--canvas-node--border-width: 2px;
		--canvas-node--border-color: var(
			--color-canvas-node-success-border-color,
			var(--color--success)
		);
	}

	&.warning {
		--canvas-node--border-width: 2px;
		--canvas-node--border-color: var(--color--warning);
	}

	&.error {
		--canvas-node--border-color: var(--canvas-node--border-color--error, var(--color--danger));
	}

	&.pinned {
		--canvas-node--border-width: 2px;
		--canvas-node--border-color: var(
			--color-canvas-node-pinned-border-color,
			var(--node--border-color--pinned)
		);
	}

	&.disabled {
		--canvas-node--border-color: var(
			--color-canvas-node-disabled-border-color,
			var(--color--foreground)
		);
	}

	&.running {
		border-color: transparent;
		--canvas-node--border-color: var(
			--color-canvas-node-running-border-color,
			var(--node--border-color--running)
		);
	}

	&.waiting {
		--canvas-node--border-color: transparent;
	}
}

/* stylelint-disable */
.running::after,
.waiting::after {
	content: '';
	position: absolute;
	inset: -3px;
	border-radius: 10px;
	z-index: -1;
	background: conic-gradient(
		from var(--node--gradient-angle),
		rgba(255, 109, 90, 1),
		rgba(255, 109, 90, 1) 20%,
		rgba(255, 109, 90, 0.2) 35%,
		rgba(255, 109, 90, 0.2) 65%,
		rgba(255, 109, 90, 1) 90%,
		rgba(255, 109, 90, 1)
	);
}

.running::after {
	animation: border-rotate 1.5s linear infinite;
}
.waiting::after {
	animation: border-rotate 4.5s linear infinite;
}

@property --node--gradient-angle {
	syntax: '<angle>';
	initial-value: 0deg;
	inherits: false;
}

@keyframes border-rotate {
	from {
		--node--gradient-angle: 0deg;
	}
	to {
		--node--gradient-angle: 360deg;
	}
}
/* stylelint-enable */

.description {
	top: 100%;
	position: absolute;
	width: 100%;
	min-width: calc(var(--canvas-node--width) * 2);
	margin-top: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	pointer-events: none;
}

.label,
.disabledLabel {
	font-size: var(--font-size--md);
	text-align: center;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	overflow-wrap: anywhere;
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
}

.subtitle {
	width: 100%;
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--sm);
	font-weight: var(--font-weight--regular);
}

.statusIcons {
	position: absolute;
	bottom: var(--canvas-node--status-icons--margin);
	right: var(--canvas-node--status-icons--margin);
}

.icon {
	flex-grow: 0;
	flex-shrink: 0;
}
</style>
