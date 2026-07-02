<script lang="ts" setup>
import { computed, ref, useCssModule, watch } from 'vue';
import { useNodeConnections } from '@/app/composables/useNodeConnections';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeDefaultRender } from '../../../../canvas.types';
import { injectCanvasRenderData } from '@/features/workflows/canvas/canvas.utils';
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
import { getNodeIconSize, type NodeIconSource } from '@/app/utils/nodeIcon';

const $style = useCssModule();
const i18n = useI18n();

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
	activate: [id: string, event: MouseEvent];
	'replace:node': [id: string];
}>();

const { initialized, viewport, isExperimentalNdvActive } = useCanvas();
const { calculateNodeBorderOpacityStyle } = useZoomAdjustedValues(viewport);
const route = useRoute();
const {
	id,
	name,
	label,
	subtitle,
	connections,
	isDisabled,
	isReadOnly,
	isSelected,
	executionStatus,
	executionWaiting,
	executionWaitingForNext,
	executionRunning,
	hasRunData,
	render,
	isNotInstalledCommunityNode,
} = useCanvasNode();
const renderData = injectCanvasRenderData();
const inputs = computed(() => renderData.value.nodeInputsByNodeId.get(id.value)?.value ?? []);
const outputs = computed(() => renderData.value.nodeOutputsByNodeId.get(id.value)?.value ?? []);
const hasExecutionErrors = computed(
	() => (renderData.value.executionIssuesByNodeName.get(name.value)?.value?.length ?? 0) > 0,
);
const hasPinnedData = computed(
	() =>
		!renderData.value.isExecutionDataDisplayed &&
		!!renderData.value.pinnedDataByNodeName[name.value],
);
const hasExecutionPinData = computed(
	() =>
		renderData.value.isExecutionDataDisplayed &&
		!!renderData.value.executionPinDataByNodeName[name.value],
);
const hasSubstitutedOutput = computed(() => hasPinnedData.value || hasExecutionPinData.value);
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
	const waiting = Boolean(executionWaiting.value || executionStatus.value === 'waiting');
	const running = Boolean(executionRunning.value || executionWaitingForNext.value);
	return {
		[$style.node]: true,
		[$style.selected]: isSelected.value,
		[$style.disabled]:
			isDisabled.value || (isNotInstalledCommunityNode.value && !isDemoRoute.value),
		[$style.success]: Boolean(
			hasRunData.value && executionStatus.value === 'success' && !hasExecutionPinData.value,
		),
		[$style.error]: hasExecutionErrors.value,
		[$style.running]: running,
		[$style.waiting]: waiting,
		[$style.pinned]: hasSubstitutedOutput.value,
		[$style.configurable]: renderOptions.value.configurable,
		[$style.configuration]: renderOptions.value.configuration,
		[$style.trigger]: renderOptions.value.trigger,
		[$style.warning]: renderOptions.value.dirtiness !== undefined,
		[$style.placeholder]: renderOptions.value.placeholder,
		waiting,
		running,
	};
});

const iconSize = computed(() => {
	const iconName = iconSource.value?.type === 'icon' ? iconSource.value.name : undefined;
	if (renderOptions.value.configuration) return getNodeIconSize('configuration', iconName);
	return getNodeIconSize('canvas', iconName);
});

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

const nodeBorderOpacityStyle = calculateNodeBorderOpacityStyle();

const styles = computed(() => ({
	'--canvas-node--width': `${nodeSize.value.width}px`,
	'--canvas-node--height': `${nodeSize.value.height}px`,
	'--node--icon--size': `${iconSize.value}px`,
	...nodeBorderOpacityStyle.value,
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

const iconSource = computed(() => {
	if (renderOptions.value.placeholder) {
		return {
			type: 'icon',
			name: 'plus',
		} as NodeIconSource;
	}
	return renderOptions.value.icon;
});

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
	if (renderOptions.value.placeholder) {
		emit('replace:node', id.value);
		return;
	}

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
				!(hasSubstitutedOutput && !nodeHelpers.isProductionExecutionPreview.value)
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
@use './_canvasNodeStyles.scss' as styles;

.node {
	@include styles.canvas-node-border-defaults;
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
	@include styles.canvas-node-border;
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
		@include styles.canvas-node-selected-ring;
	}

	&.success {
		@include styles.status-success;
	}

	&.warning {
		@include styles.status-warning;
	}

	&.error {
		@include styles.status-error;
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
		@include styles.status-running-border;
	}

	&.waiting {
		@include styles.status-waiting-border;
	}

	&.placeholder {
		background: var(--color--foreground--tint-2);
		border: 2px dashed var(--color--foreground--shade-2);
		cursor: pointer;

		&:hover {
			.icon {
				color: var(--color--primary);
			}
		}
	}
}

/* stylelint-disable */
.running::after,
.waiting::after {
	@include styles.status-animated-after;
}

.running::after {
	@include styles.status-running-animation;
}
.waiting::after {
	@include styles.status-waiting-animation;
}

@include styles.status-animation-definitions;
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
