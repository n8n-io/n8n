<script setup lang="ts">
import { useStorage } from '@/composables/useStorage';
import {
	CUSTOM_API_CALL_KEY,
	FORM_NODE_TYPE,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG,
	MANUAL_TRIGGER_NODE_TYPE,
	NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS,
	SIMULATE_NODE_TYPE,
	SIMULATE_TRIGGER_NODE_TYPE,
	WAIT_NODE_TYPE,
	WAIT_TIME_UNLIMITED,
} from '@/constants';
import type {
	ExecutionSummary,
	INodeOutputConfiguration,
	ITaskData,
	NodeOperationError,
	Workflow,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import type { StyleValue } from 'vue';
import { computed, onMounted, ref, watch } from 'vue';
import xss from 'xss';

import NodeIcon from '@/components/NodeIcon.vue';
import TitledList from '@/components/TitledList.vue';

import { useContextMenu } from '@/composables/useContextMenu';
import { useDebounce } from '@/composables/useDebounce';
import { useI18n } from '@/composables/useI18n';
import { useNodeBase } from '@/composables/useNodeBase';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { usePinnedData } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import type { INodeUi, XYPosition } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import { get } from 'lodash-es';
import { N8nIconButton, useDeviceSupport } from 'n8n-design-system';

type Props = {
	name: string;
	instance: BrowserJsPlumbInstance;
	workflow: Workflow;
	isReadOnly?: boolean;
	isActive?: boolean;
	hideActions?: boolean;
	disableSelecting?: boolean;
	showCustomTooltip?: boolean;
	isProductionExecutionPreview?: boolean;
	disablePointerEvents?: boolean;
	hideNodeIssues?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
	isActive: false,
	hideActions: false,
	disableSelecting: false,
	showCustomTooltip: false,
	isProductionExecutionPreview: false,
	disablePointerEvents: false,
	hideNodeIssues: false,
});

const emit = defineEmits<{
	run: [data: { name: string; data: ITaskData[]; waiting: boolean }];
	runWorkflow: [node: string, source: string];
	removeNode: [node: string];
	toggleDisableNode: [node: INodeUi];
}>();

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const uiStore = useUIStore();

const contextMenu = useContextMenu();
const nodeHelpers = useNodeHelpers();
const pinnedData = usePinnedData(workflowsStore.getNodeByName(props.name));
const deviceSupport = useDeviceSupport();
const { callDebounced } = useDebounce();
const i18n = useI18n();
const telemetry = useTelemetry();

const nodeBase = useNodeBase({
	name: props.name,
	instance: props.instance,
	workflowObject: props.workflow,
	isReadOnly: props.isReadOnly,
	emit: emit as (event: string, ...args: unknown[]) => void,
});

const isTouchActive = ref(false);
const nodeSubtitle = ref('');
const showTriggerNodeTooltip = ref(false);
const pinDataDiscoveryTooltipVisible = ref(false);
const dragging = ref(false);

const node = computed(() => workflowsStore.getNodeByName(props.name));
const nodeId = computed(() => node.value?.id ?? '');
const showPinnedDataInfo = computed(
	() => pinnedData.hasData.value && !props.isProductionExecutionPreview,
);

const isScheduledGroup = computed(() => nodeType.value?.group.includes('schedule') === true);
const iconColorDefault = computed(() => {
	if (isConfigNode.value) {
		return 'var(--color-text-base)';
	}
	return undefined;
});

const nodeRunData = computed(() => {
	if (!node.value) return [];

	return workflowsStore.getWorkflowResultDataByNodeName(node.value.name) ?? [];
});

const hasIssues = computed(() => {
	if (nodeExecutionStatus.value && ['crashed', 'error'].includes(nodeExecutionStatus.value))
		return true;
	if (pinnedData.hasData.value) return false;
	if (node.value?.issues !== undefined && Object.keys(node.value.issues).length) {
		return true;
	}
	return false;
});

const workflowDataItems = computed(() => {
	const workflowResultDataNode = nodeRunData.value;
	if (workflowResultDataNode === null) {
		return 0;
	}

	return workflowResultDataNode.length;
});
const canvasOffsetPosition = computed(() => uiStore.nodeViewOffsetPosition);

const getTriggerNodeTooltip = computed(() => {
	if (nodeType.value !== null && nodeType.value.hasOwnProperty('eventTriggerDescription')) {
		const nodeName = i18n.shortNodeType(nodeType.value.name);
		const { eventTriggerDescription } = nodeType.value;
		return i18n.nodeText().eventTriggerDescription(nodeName, eventTriggerDescription ?? '');
	} else {
		return i18n.baseText('node.waitingForYouToCreateAnEventIn', {
			interpolate: {
				nodeType: nodeType.value ? getTriggerNodeServiceName(nodeType.value) : '',
			},
		});
	}
});

const isPollingTypeNode = computed(() => !!nodeType.value?.polling);

const isExecuting = computed(() => {
	if (!node.value || !workflowRunning.value) return false;
	return workflowsStore.isNodeExecuting(node.value.name);
});

const isSingleActiveTriggerNode = computed(() => {
	const nodes = workflowsStore.workflowTriggerNodes.filter((triggerNode) => {
		const nodeType = nodeTypesStore.getNodeType(triggerNode.type, triggerNode.typeVersion);
		return nodeType && nodeType.eventTriggerDescription !== '' && !triggerNode.disabled;
	});

	return nodes.length === 1;
});

const isManualTypeNode = computed(() => node.value?.type === MANUAL_TRIGGER_NODE_TYPE);

const isConfigNode = computed(() => {
	if (!node.value) return false;
	return nodeTypesStore.isConfigNode(props.workflow, node.value, node.value.type ?? '');
});

const isConfigurableNode = computed(() => {
	if (!node.value) return false;

	return nodeTypesStore.isConfigurableNode(props.workflow, node.value, node.value?.type ?? '');
});

const isTriggerNode = computed(() =>
	node.value ? nodeTypesStore.isTriggerNode(node.value.type) : false,
);
const isTriggerNodeTooltipEmpty = computed(() =>
	nodeType.value !== null ? nodeType.value.eventTriggerDescription === '' : false,
);
const isNodeDisabled = computed(() => node.value?.disabled ?? false);
const nodeType = computed(
	() => node.value && nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
);
const nodeWrapperClass = computed(() => {
	const classes: Record<string, boolean> = {
		'node-wrapper': true,
		'node-wrapper--trigger': isTriggerNode.value,
		'node-wrapper--configurable': isConfigurableNode.value,
		'node-wrapper--config': isConfigNode.value,
	};

	if (nodeBase.outputs.value.length) {
		const outputTypes = NodeHelpers.getConnectionTypes(nodeBase.outputs.value);
		const otherOutputs = outputTypes.filter((outputName) => outputName !== NodeConnectionType.Main);
		if (otherOutputs.length) {
			otherOutputs.forEach((outputName) => {
				classes[`node-wrapper--connection-type-${outputName}`] = true;
			});
		}
	}

	return classes;
});

const nodeWrapperStyles = computed<StyleValue>(() => {
	const styles: StyleValue = {
		left: position.value[0] + 'px',
		top: position.value[1] + 'px',
	};

	if (node.value && nodeType.value) {
		const inputs = NodeHelpers.getNodeInputs(props.workflow, node.value, nodeType.value) ?? [];
		const inputTypes = NodeHelpers.getConnectionTypes(inputs);

		const nonMainInputs = inputTypes.filter((input) => input !== NodeConnectionType.Main);
		if (nonMainInputs.length) {
			const requiredNonMainInputs = inputs.filter(
				(input) => typeof input !== 'string' && input.required,
			);

			let spacerCount = 0;
			if (NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS) {
				const requiredNonMainInputsCount = requiredNonMainInputs.length;
				const optionalNonMainInputsCount = nonMainInputs.length - requiredNonMainInputsCount;
				spacerCount = requiredNonMainInputsCount > 0 && optionalNonMainInputsCount > 0 ? 1 : 0;
			}

			styles['--configurable-node-input-count'] = nonMainInputs.length + spacerCount;
		}

		const mainInputs = inputTypes.filter((output) => output === NodeConnectionType.Main);
		styles['--node-main-input-count'] = mainInputs.length;

		let outputs = [] as Array<NodeConnectionType | INodeOutputConfiguration>;
		if (props.workflow.nodes[node.value.name]) {
			outputs = NodeHelpers.getNodeOutputs(props.workflow, node.value, nodeType.value);
		}

		const outputTypes = NodeHelpers.getConnectionTypes(outputs);

		const mainOutputs = outputTypes.filter((output) => output === NodeConnectionType.Main);
		styles['--node-main-output-count'] = mainOutputs.length;
	}

	return styles;
});

const nodeClass = computed(() => {
	return {
		'node-box': true,
		disabled: node.value?.disabled,
		executing: isExecuting.value,
	};
});

const nodeExecutionStatus = computed(() => {
	const nodeExecutionRunData = workflowsStore.getWorkflowRunData?.[props.name];
	if (nodeExecutionRunData) {
		return nodeExecutionRunData.filter(Boolean)?.[0]?.executionStatus ?? '';
	}
	return '';
});

const nodeIssues = computed(() => {
	const issues: string[] = [];
	const nodeExecutionRunData = workflowsStore.getWorkflowRunData?.[props.name];
	if (nodeExecutionRunData) {
		nodeExecutionRunData.forEach((executionRunData) => {
			if (executionRunData?.error) {
				const { message, description } = executionRunData.error;
				const issue = `${message}${description ? ` (${description})` : ''}`;
				issues.push(xss(issue));
			}
		});
	}
	if (node.value?.issues !== undefined) {
		issues.push(...NodeHelpers.nodeIssuesToString(node.value.issues, node.value));
	}
	return issues;
});

const nodeDisabledTitle = computed(() => {
	return node.value?.disabled ? i18n.baseText('node.enable') : i18n.baseText('node.disable');
});

const position = computed<XYPosition>(() => (node.value ? node.value.position : [0, 0]));
const showDisabledLineThrough = computed(
	() =>
		!isConfigurableNode.value &&
		!!(
			node.value?.disabled &&
			nodeBase.inputs.value.length === 1 &&
			nodeBase.outputs.value.length === 1
		),
);

const nodeTitle = computed(() => {
	if (node.value?.name === 'Start') {
		return i18n.headerText({
			key: 'headers.start.displayName',
			fallback: 'Start',
		});
	}

	return node.value?.name ?? '';
});

const waiting = computed(() => {
	const workflowExecution = workflowsStore.getWorkflowExecution as ExecutionSummary;

	if (workflowExecution?.waitTill && !workflowExecution?.finished) {
		const lastNodeExecuted = get(workflowExecution, 'data.resultData.lastNodeExecuted');
		if (props.name === lastNodeExecuted) {
			const node = props.workflow.getNode(lastNodeExecuted);
			if (
				node &&
				node.type === WAIT_NODE_TYPE &&
				['webhook', 'form'].includes(node.parameters.resume as string)
			) {
				const event =
					node.parameters.resume === 'webhook'
						? i18n.baseText('node.theNodeIsWaitingWebhookCall')
						: i18n.baseText('node.theNodeIsWaitingFormCall');
				return event;
			}
			if (node?.parameters.operation === SEND_AND_WAIT_OPERATION) {
				return i18n.baseText('node.theNodeIsWaitingUserInput');
			}
			if (node?.type === FORM_NODE_TYPE) {
				return i18n.baseText('node.theNodeIsWaitingFormCall');
			}
			const waitDate = new Date(workflowExecution.waitTill);
			if (waitDate.toISOString() === WAIT_TIME_UNLIMITED) {
				return i18n.baseText('node.theNodeIsWaitingIndefinitelyForAnIncomingWebhookCall');
			}
			return i18n.baseText('node.nodeIsWaitingTill', {
				interpolate: {
					date: waitDate.toLocaleDateString(),
					time: waitDate.toLocaleTimeString(),
				},
			});
		}
	}

	return undefined;
});

const workflowRunning = computed(() => uiStore.isActionActive.workflowRunning);
const nodeStyle = computed<StyleValue>(() => {
	const returnStyles: StyleValue = {};

	let borderColor = '--color-foreground-xdark';

	if (isConfigurableNode.value || isConfigNode.value) {
		borderColor = '--color-foreground-dark';
	}

	if (node.value?.disabled) {
		borderColor = '--color-foreground-base';
	} else if (!isExecuting.value) {
		if (hasIssues.value && !props.hideNodeIssues) {
			// Do not set red border if there is an issue with the configuration node
			if (
				(nodeRunData.value?.[0]?.error as NodeOperationError)?.functionality !==
				'configuration-node'
			) {
				borderColor = '--color-danger';
				returnStyles['border-width'] = '2px';
				returnStyles['border-style'] = 'solid';
			}
		} else if (!!waiting.value || showPinnedDataInfo.value) {
			borderColor = '--color-node-pinned-border';
		} else if (nodeExecutionStatus.value === 'unknown') {
			borderColor = '--color-foreground-xdark';
		} else if (workflowDataItems.value) {
			returnStyles['border-width'] = '2px';
			returnStyles['border-style'] = 'solid';
			borderColor = '--color-success';
		}
	}

	returnStyles['border-color'] = `var(${borderColor})`;

	return returnStyles;
});

const isSelected = computed(
	() => uiStore.getSelectedNodes.find((n) => n.name === node.value?.name) !== undefined,
);

const shiftOutputCount = computed(() => !!(nodeType.value && nodeBase.outputs.value.length > 2));
const shouldShowTriggerTooltip = computed(() => {
	return (
		!!node.value &&
		isTriggerNode.value &&
		!isPollingTypeNode.value &&
		!pinnedData.hasData.value &&
		!isNodeDisabled.value &&
		workflowRunning.value &&
		workflowDataItems.value === 0 &&
		isSingleActiveTriggerNode.value &&
		!isTriggerNodeTooltipEmpty.value &&
		!hasIssues.value &&
		!dragging.value
	);
});

const isContextMenuOpen = computed(
	() =>
		contextMenu.isOpen.value &&
		contextMenu.target.value?.source === 'node-button' &&
		contextMenu.target.value.nodeId === node.value?.id,
);

const iconNodeType = computed(() => {
	if (node.value?.type === SIMULATE_NODE_TYPE || node.value?.type === SIMULATE_TRIGGER_NODE_TYPE) {
		const icon = node.value.parameters?.icon as string;
		const iconValue = props.workflow.expression.getSimpleParameterValue(
			node.value,
			icon,
			'internal',
			{},
		);
		if (iconValue && typeof iconValue === 'string') {
			return nodeTypesStore.getNodeType(iconValue);
		}
	}

	return nodeType.value;
});
const hasSeenPinDataTooltip = useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG);

watch(
	() => props.isActive,
	(newValue, oldValue) => {
		if (!newValue && oldValue) {
			setSubtitle();
		}
	},
);

watch(canvasOffsetPosition, () => {
	if (showTriggerNodeTooltip.value) {
		showTriggerNodeTooltip.value = false;
		setTimeout(() => {
			showTriggerNodeTooltip.value = shouldShowTriggerTooltip.value;
		}, 200);
	}

	if (pinDataDiscoveryTooltipVisible.value) {
		pinDataDiscoveryTooltipVisible.value = false;
		setTimeout(() => {
			pinDataDiscoveryTooltipVisible.value = true;
		}, 200);
	}
});

watch(shouldShowTriggerTooltip, (newValue) => {
	if (newValue) {
		setTimeout(() => {
			showTriggerNodeTooltip.value = shouldShowTriggerTooltip.value;
		}, 2500);
	} else {
		showTriggerNodeTooltip.value = false;
	}
});

watch(
	nodeRunData,
	(newValue) => {
		if (!node.value) {
			return;
		}

		emit('run', { name: node.value.name, data: newValue, waiting: !!waiting.value });
	},
	{ deep: true },
);

const unwatchWorkflowDataItems = watch(workflowDataItems, (dataItemsCount: number) => {
	if (!hasSeenPinDataTooltip.value) showPinDataDiscoveryTooltip(dataItemsCount);
});

onMounted(() => {
	// Initialize the node
	if (node.value !== null) {
		try {
			nodeBase.addNode(node.value);
		} catch (error) {
			// This breaks when new nodes are loaded into store but workflow tab is not currently active
			// Shouldn't affect anything
		}
	}

	setTimeout(() => {
		setSubtitle();
	}, 0);

	setTimeout(() => {
		if (nodeRunData.value && node.value) {
			emit('run', {
				name: node.value.name,
				data: nodeRunData.value,
				waiting: !!waiting.value,
			});
		}
	}, 0);
});

function showPinDataDiscoveryTooltip(dataItemsCount: number): void {
	if (
		!isTriggerNode.value ||
		isManualTypeNode.value ||
		isScheduledGroup.value ||
		uiStore.isAnyModalOpen ||
		dataItemsCount === 0 ||
		pinnedData.hasData.value
	)
		return;

	useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG).value = 'true';

	pinDataDiscoveryTooltipVisible.value = true;
	unwatchWorkflowDataItems();
}

function setSubtitle() {
	if (!node.value || !nodeType.value) return;
	// why is this not a computed property? because it's a very expensive operation
	// it requires expressions to resolve each subtitle...
	// and ends up bogging down the UI with big workflows, for example when pasting a workflow or even opening a node...
	// so we only update it when necessary (when node is mounted and when it's opened and closed (isActive))
	try {
		const subtitle = nodeHelpers.getNodeSubtitle(node.value, nodeType.value, props.workflow) ?? '';

		nodeSubtitle.value = subtitle.includes(CUSTOM_API_CALL_KEY) ? '' : subtitle;
	} catch (e) {
		// avoid breaking UI if expression error occurs
	}
}

function executeNode() {
	if (!node.value) return;
	emit('runWorkflow', node.value.name, 'Node.executeNode');
	telemetry.track('User clicked node hover button', {
		node_type: node.value.type,
		button_name: 'execute',
		workflow_id: workflowsStore.workflowId,
	});
}

function deleteNode() {
	if (!node.value) return;
	telemetry.track('User clicked node hover button', {
		node_type: node.value.type,
		button_name: 'delete',
		workflow_id: workflowsStore.workflowId,
	});

	emit('removeNode', node.value.name);
}

function toggleDisableNode(event: MouseEvent) {
	if (!node.value) return;
	(event.currentTarget as HTMLButtonElement).blur();
	telemetry.track('User clicked node hover button', {
		node_type: node.value?.type,
		button_name: 'disable',
		workflow_id: workflowsStore.workflowId,
	});
	emit('toggleDisableNode', node.value);
}

function onClick(event: MouseEvent) {
	void callDebounced(onClickDebounced, { debounceTime: 50, trailing: true }, event);
}

function onClickDebounced(...args: unknown[]) {
	const event = args[0] as MouseEvent;
	const isDoubleClick = event.detail >= 2;
	if (isDoubleClick) {
		setNodeActive();
	} else {
		nodeBase.mouseLeftClick(event);
	}
}

function setNodeActive() {
	ndvStore.activeNodeName = node.value ? node.value.name : '';
	pinDataDiscoveryTooltipVisible.value = false;
}

function touchStart() {
	if (deviceSupport.isTouchDevice && !deviceSupport.isMacOs && !isTouchActive.value) {
		isTouchActive.value = true;
		setTimeout(() => {
			isTouchActive.value = false;
		}, 2000);
	}
}

const touchEnd = nodeBase.touchEnd;

function openContextMenu(event: MouseEvent, source: 'node-button' | 'node-right-click') {
	if (node.value) {
		contextMenu.open(event, { source, nodeId: node.value.id });
	}
}
</script>

<template>
	<div
		v-if="node"
		:id="nodeId"
		:ref="node.name"
		:class="nodeWrapperClass"
		:style="nodeWrapperStyles"
		data-test-id="canvas-node"
		:data-name="node.name"
		:data-node-type="nodeType?.name"
		@contextmenu="(e: MouseEvent) => openContextMenu(e, 'node-right-click')"
	>
		<div v-show="isSelected" class="select-background"></div>
		<div
			:class="{
				'node-default': true,
				'touch-active': isTouchActive,
				'is-touch-device': deviceSupport.isTouchDevice,
				'menu-open': isContextMenuOpen,
				'disable-pointer-events': disablePointerEvents,
			}"
		>
			<div
				v-touch:start="touchStart"
				v-touch:end="touchEnd"
				:class="nodeClass"
				:style="nodeStyle"
				@click.left="onClick"
			>
				<i v-if="isTriggerNode" class="trigger-icon">
					<n8n-tooltip placement="bottom">
						<template #content>
							<span v-n8n-html="i18n.baseText('node.thisIsATriggerNode')" />
						</template>
						<FontAwesomeIcon icon="bolt" size="lg" />
					</n8n-tooltip>
				</i>
				<div
					v-if="!node.disabled"
					:class="{ 'node-info-icon': true, 'shift-icon': shiftOutputCount }"
				>
					<div v-if="hasIssues && !hideNodeIssues" class="node-issues" data-test-id="node-issues">
						<n8n-tooltip :show-after="500" placement="bottom">
							<template #content>
								<TitledList :title="`${i18n.baseText('node.issues')}:`" :items="nodeIssues" />
							</template>
							<FontAwesomeIcon icon="exclamation-triangle" />
						</n8n-tooltip>
					</div>
					<div v-else-if="waiting || nodeExecutionStatus === 'waiting'" class="waiting">
						<n8n-tooltip placement="bottom">
							<template #content>
								<div v-text="waiting"></div>
							</template>
							<FontAwesomeIcon icon="clock" />
						</n8n-tooltip>
					</div>
					<span v-else-if="showPinnedDataInfo" class="node-pin-data-icon">
						<FontAwesomeIcon icon="thumbtack" />
						<span v-if="workflowDataItems > 1" class="items-count"> {{ workflowDataItems }}</span>
					</span>
					<span v-else-if="nodeExecutionStatus === 'unknown'">
						<!-- Do nothing, unknown means the node never executed -->
					</span>
					<span v-else-if="workflowDataItems" class="data-count">
						<FontAwesomeIcon icon="check" />
						<span v-if="workflowDataItems > 1" class="items-count"> {{ workflowDataItems }}</span>
					</span>
				</div>

				<div class="node-executing-info" :title="i18n.baseText('node.nodeIsExecuting')">
					<FontAwesomeIcon icon="sync-alt" spin />
				</div>

				<div v-if="waiting" class="node-waiting-spinner" :title="waiting">
					<FontAwesomeIcon icon="sync-alt" spin />
				</div>

				<div class="node-trigger-tooltip__wrapper">
					<n8n-tooltip
						placement="top"
						:show-after="500"
						:visible="showTriggerNodeTooltip"
						popper-class="node-trigger-tooltip__wrapper--item"
					>
						<template #content>
							<div v-text="getTriggerNodeTooltip"></div>
						</template>
						<span />
					</n8n-tooltip>
					<n8n-tooltip
						v-if="isTriggerNode"
						placement="top"
						:visible="pinDataDiscoveryTooltipVisible"
						popper-class="node-trigger-tooltip__wrapper--item"
					>
						<template #content>
							{{ i18n.baseText('node.discovery.pinData.canvas') }}
						</template>
						<span />
					</n8n-tooltip>
				</div>

				<NodeIcon
					class="node-icon"
					:node-type="iconNodeType"
					:size="40"
					:shrink="false"
					:color-default="iconColorDefault"
					:disabled="node.disabled"
				/>
			</div>

			<div
				v-if="showDisabledLineThrough"
				:class="{
					'disabled-line-through': true,
					success: !['unknown'].includes(nodeExecutionStatus) && workflowDataItems > 0,
				}"
			></div>
		</div>
		<div class="node-description">
			<div class="node-name" :title="nodeTitle">
				<p data-test-id="canvas-node-box-title">
					{{ nodeTitle }}
				</p>
				<p v-if="node.disabled">({{ i18n.baseText('node.disabled') }})</p>
			</div>
			<div v-if="nodeSubtitle !== undefined" class="node-subtitle" :title="nodeSubtitle">
				{{ nodeSubtitle }}
			</div>
		</div>

		<div
			v-if="!isReadOnly"
			v-show="!hideActions"
			class="node-options no-select-on-click"
			@contextmenu.stop
			@mousedown.stop
		>
			<div class="node-options-inner">
				<N8nIconButton
					v-if="!isConfigNode"
					data-test-id="execute-node-button"
					type="tertiary"
					text
					size="small"
					icon="play"
					:disabled="workflowRunning"
					:title="i18n.baseText('node.testStep')"
					@click="executeNode"
				/>
				<N8nIconButton
					data-test-id="disable-node-button"
					type="tertiary"
					text
					size="small"
					icon="power-off"
					:title="nodeDisabledTitle"
					@click="toggleDisableNode"
				/>
				<N8nIconButton
					data-test-id="delete-node-button"
					type="tertiary"
					size="small"
					text
					icon="trash"
					:title="i18n.baseText('node.delete')"
					@click="deleteNode"
				/>
				<N8nIconButton
					data-test-id="overflow-node-button"
					type="tertiary"
					size="small"
					text
					icon="ellipsis-h"
					@click="(e: MouseEvent) => openContextMenu(e, 'node-button')"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.context-menu {
	position: absolute;
}

.node-wrapper {
	--node-width: 100px;
	/*
		Set the node height to 100px as a base.
		Increase height by 20px for each output beyond the 4th one.
		max(0, var(--node-main-output-count, 1) - 4) ensures that we only start counting after the 4th output.
	*/
	--node-height: max(
		calc(100px + max(0, var(--node-main-input-count, 1) - 3) * 30px),
		calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 20px)
	);

	--configurable-node-min-input-count: 4;
	--configurable-node-input-width: 65px;

	position: absolute;
	width: var(--node-width);
	height: var(--node-height);

	.node-description {
		position: absolute;
		top: var(--node-height);
		left: calc(var(--node-width) / 2 * -1);
		line-height: 1.5;
		text-align: center;
		cursor: default;
		padding: 8px;
		width: 100%;
		min-width: calc(var(--node-width) * 2);
		pointer-events: none; // prevent container from being draggable

		.node-name > p {
			// must be paragraph tag to have two lines in safari
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			overflow: hidden;
			overflow-wrap: anywhere;
			font-weight: var(--font-weight-bold);
			line-height: var(--font-line-height-compact);
		}

		.node-subtitle {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			font-weight: 400;
			color: $custom-font-light;
			font-size: 0.8em;
		}
	}

	&.touch-active,
	&:hover,
	&.menu-open {
		.node-options {
			opacity: 1;
		}
	}

	.node-options {
		:deep(.button) {
			--button-font-color: var(--color-text-light);
			--button-border-radius: 0;
		}
		cursor: default;
		position: absolute;
		bottom: 100%;
		z-index: 11;
		min-width: 100%;
		display: flex;
		left: calc(-1 * var(--spacing-4xs));
		right: calc(-1 * var(--spacing-4xs));
		justify-content: center;
		align-items: center;
		padding-bottom: var(--spacing-2xs);
		font-size: var(--font-size-s);
		opacity: 0;
		transition: opacity 100ms ease-in;

		&-inner {
			display: flex;
			align-items: center;
			background-color: var(--color-canvas-background);
			border-radius: var(--border-radius-base);
		}
	}

	.node-default {
		position: absolute;
		width: 100%;
		height: 100%;
		cursor: pointer;
		&.disable-pointer-events {
			pointer-events: none;
		}

		.node-box {
			width: 100%;
			height: 100%;
			border: 2px solid var(--color-foreground-xdark);
			border-radius: var(--border-radius-large);
			background-color: var(--color-node-background);
			--color-background-node-icon-badge: var(--color-node-background);
			&.executing {
				background-color: var(--color-node-executing-background) !important;

				.node-executing-info {
					display: inline-block;
				}
			}
		}

		.node-executing-info {
			display: none;
			position: absolute;
			left: 0px;
			top: 0px;
			z-index: 12;
			width: 100%;
			height: 100%;
			font-size: 3.75em;
			line-height: 1.65em;
			text-align: center;
			color: hsla(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l), 0.7);
		}

		.node-waiting-spinner {
			display: inline-block;
			position: absolute;
			left: 0px;
			top: 0px;
			z-index: 12;
			width: 100%;
			height: 100%;
			font-size: 3.75em;
			line-height: 1.65em;
			text-align: center;
			color: hsla(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l), 0.7);
		}

		.node-icon {
			position: absolute;
			top: calc(50% - 20px);
			left: calc(50% - 20px);
		}

		.node-info-icon {
			position: absolute;
			bottom: 6px;
			right: 6px;

			&.shift-icon {
				right: 12px;
			}

			.data-count {
				font-weight: 600;
				color: var(--color-success);
			}

			.node-issues {
				color: var(--color-danger);
			}

			.items-count {
				font-size: var(--font-size-s);
				padding: 0;
			}
		}

		.node-pin-data-icon {
			color: var(--color-secondary);
			margin-right: 2px;

			svg {
				height: 0.85rem;
			}
		}

		.waiting {
			color: var(--color-secondary);
		}
	}

	&--config {
		--configurable-node-input-width: 55px;
		--node-width: 75px;
		--node-height: 75px;

		.node-default {
			.node-icon {
				scale: 0.75;
			}

			.node-box {
				border: 2px solid var(--color-foreground-xdark);
				border-radius: 50px;

				&.executing {
					background-color: var(--color-node-executing-other-background) !important;
				}

				.node-executing-info {
					font-size: 2.85em;
				}
			}
		}

		@each $node-type in $supplemental-node-types {
			&.node-wrapper--connection-type-#{$node-type} {
				.node-default .node-box {
					background: var(--node-type-#{$node-type}-background);
				}

				.node-description {
					.node-subtitle {
						color: var(--node-type-#{$node-type}-color);
					}
				}
			}
		}

		.node-info-icon {
			bottom: 4px !important;
			right: 50% !important;
			transform: translateX(50%) scale(0.75);
		}

		&.node-wrapper--configurable {
			--configurable-node-icon-offset: 20px;

			.node-info-icon {
				bottom: 1px !important;
				right: 1px !important;
			}
		}
	}

	&--configurable {
		--node-width: var(
			--configurable-node-width,
			calc(
				max(var(--configurable-node-input-count, 5), var(--configurable-node-min-input-count)) *
					var(--configurable-node-input-width)
			)
		);
		--configurable-node-icon-offset: 40px;
		--configurable-node-icon-size: 30px;

		.node-description {
			top: calc(50%);
			transform: translateY(-50%);
			left: calc(
				var(--configurable-node-icon-offset) + var(--configurable-node-icon-size) + var(--spacing-s)
			);
			text-align: left;
			overflow: auto;
			white-space: normal;
			min-width: unset;
			max-width: calc(
				var(--node-width) - var(--configurable-node-icon-offset) - var(
						--configurable-node-icon-size
					) - 2 * var(--spacing-s)
			);
			.node-name > p {
				color: var(--color-configurable-node-name);
			}
		}

		.node-default {
			.node-icon {
				left: var(--configurable-node-icon-offset);
			}

			.node-executing-info {
				left: -67px;
			}
		}

		&[data-node-type='@n8n/n8n-nodes-langchain.chatTrigger'] {
			--configurable-node-min-input-count: 1;
			--configurable-node-input-width: 176px;
		}
	}

	&--trigger .node-default .node-box {
		border-radius: 32px 8px 8px 32px;
	}

	.trigger-icon {
		position: absolute;
		right: 100%;
		top: 0;
		bottom: 0;
		margin: auto;
		color: var(--color-primary);
		align-items: center;
		justify-content: center;
		height: fit-content;
		// Increase click radius of the bolt icon
		padding: var(--spacing-2xs);
	}
}

.select-background {
	--node--selected--box-shadow-radius: 8px;

	display: block;
	background-color: var(--color-canvas-selected);
	border-radius: var(--border-radius-xlarge);
	overflow: hidden;
	position: absolute;
	left: calc(var(--node--selected--box-shadow-radius) * -1) !important;
	top: calc(var(--node--selected--box-shadow-radius) * -1) !important;
	height: calc(100% + 2 * var(--node--selected--box-shadow-radius));
	width: calc(100% + 2 * var(--node--selected--box-shadow-radius)) !important;

	.node-wrapper--trigger & {
		border-radius: 36px 8px 8px 36px;
	}

	.node-wrapper--config & {
		--node--selected--box-shadow-radius: 4px;
		border-radius: 60px;
	}
}

.disabled-line-through {
	border: 1px solid var(--color-foreground-dark);
	position: absolute;
	top: 49px;
	left: -3px;
	width: 111px;
	pointer-events: none;

	&.success {
		border-color: var(--color-success-light);
	}
}
</style>

<style lang="scss">
.jtk-endpoint {
	z-index: 2;
}

.node-trigger-tooltip {
	&__wrapper {
		top: -22px;
		left: 50px;
		position: relative;

		&--item {
			max-width: 160px;
			position: fixed;
			z-index: 0 !important;
		}
	}
}
.dot-output-endpoint:hover circle {
	fill: var(--color-primary);
}
/** connector */
.jtk-connector {
	z-index: 3;
}

.jtk-floating-endpoint {
	opacity: 0;
}

.jtk-connector path {
	transition: stroke 0.1s ease-in-out;
}

.jtk-overlay {
	z-index: 3;
}
.jtk-connector {
	z-index: 4;
}
.node-input-endpoint-label,
.node-output-endpoint-label,
.connection-run-items-label {
	z-index: 5;
}
.jtk-connector.jtk-hover {
	z-index: 6;
}

.jtk-endpoint.plus-endpoint {
	z-index: 6;
}
.jtk-endpoint.dot-output-endpoint {
	z-index: 7;
	overflow: auto;
}

.disabled-line-through {
	z-index: 8;
}

.jtk-drag-active.dot-output-endpoint,
.jtk-drag-active.rect-input-endpoint {
	z-index: 9;
}
.rect-input-endpoint > * {
	pointer-events: none;
}

.connection-actions {
	z-index: 100;
}

.drop-add-node-label {
	z-index: 10;
}
</style>

<style lang="scss">
:root {
	--endpoint-size-small: 14px;
	--endpoint-size-medium: 18px;
	--stalk-size: 40px;
	--stalk-medium-size: 60px;
	--stalk-large-size: 90px;
	--stalk-success-size: 87px;
	--stalk-success-size-without-label: 40px;
	--stalk-long-size: 127px;
	--plus-endpoint-box-size: 24px;
	--plus-endpoint-box-size-small: 17px;
}

.plus-svg-circle {
	z-index: 111;
	circle {
		stroke: var(--color-foreground-xdark);
		stroke-width: 2px;
		fill: var(--color-foreground-xdark);
	}

	&:hover {
		circle {
			stroke: var(--color-primary);
			fill: var(--color-primary);
		}
	}
}
.plus-stalk {
	width: calc(var(--stalk-size) + 2px);
	border: 1px solid var(--color-foreground-dark);
	margin-left: calc(var(--stalk-size) / 2);
	z-index: 3;
	&.ep-success {
		border-color: var(--color-success-light);

		&:after {
			content: attr(data-label);
			position: absolute;
			left: 0;
			right: 0;
			bottom: 100%;
			margin: auto;
			margin-bottom: 2px;
			text-align: center;

			line-height: 1.3em;
			font-size: var(--font-size-s);
			font-weight: var(--font-weight-regular);
			color: var(--color-success);
		}
	}
}
.connection-run-items-label {
	// Disable points events so that the label does not block the connection
	// mouse over event.
	pointer-events: none;
	span {
		background-color: hsla(
			var(--color-canvas-background-h),
			var(--color-canvas-background-s),
			var(--color-canvas-background-l),
			0.85
		);
		border-radius: var(--border-radius-base);
		line-height: 1.3em;
		padding: 0px 3px;
		white-space: nowrap;
		font-size: var(--font-size-s);
		font-weight: var(--font-weight-regular);
		margin-top: -15px;

		&.floating {
			position: absolute;
			top: -6px;
			transform: translateX(-50%);
		}
	}
}

.connection-input-name-label {
	position: relative;

	span {
		position: absolute;
		top: -10px;
		left: -60px;
	}
}

.plus-endpoint {
	cursor: pointer;
	z-index: 10;
	margin-left: calc((var(--stalk-size) + var(--plus-endpoint-box-size) / 2) - 1px);
	g {
		fill: var(--color-background-xlight);
		pointer-events: none;
	}

	&:hover {
		path {
			fill: var(--color-primary);
		}
		rect {
			stroke: var(--color-primary);
		}
	}
	path {
		fill: var(--color-foreground-xdark);
	}
	rect {
		stroke: var(--color-foreground-xdark);
	}

	&.error {
		path {
			fill: var(--color-node-error-output-text-color);
		}
		rect {
			stroke: var(--color-node-error-output-text-color);
		}
	}

	&.small {
		margin-left: calc((var(--stalk-size) + var(--plus-endpoint-box-size-small) / 2));
		g {
			transform: scale(0.75);
			transform-origin: center;
		}
		rect {
			stroke-width: 2.5;
		}
	}
	&:hover .plus-container {
		color: var(--color-primary);
		border: 2px solid var(--color-primary);
	}
	&:hover .drop-hover-message {
		display: block;
	}

	&.hidden {
		display: none;
	}
}

.diamond-output-endpoint {
	--diamond-output-endpoint--transition-duration: 0.15s;

	transition: transform var(--diamond-output-endpoint--transition-duration) ease;
	transform: rotate(45deg);
	z-index: 10;
}

.add-input-endpoint {
	--add-input-endpoint--transition-duration: 0.15s;

	&:not(.jtk-endpoint-connected) {
		cursor: pointer;
	}

	&.add-input-endpoint-multiple {
		z-index: 100;
		cursor: pointer;
	}

	&.jtk-endpoint-connected {
		z-index: 10;
	}

	&.add-input-endpoint-error {
		--endpoint-svg-color: var(--color-danger);
	}

	.add-input-endpoint-default {
		transition: transform var(--add-input-endpoint--transition-duration) ease;
	}

	.add-input-endpoint-diamond {
		transition: fill var(--add-input-endpoint--transition-duration) ease;
		fill: var(--svg-color, var(--color-primary));
	}

	.add-input-endpoint-line {
		transition: fill var(--add-input-endpoint--transition-duration) ease;
		fill: var(--svg-color, var(--color-primary));
	}

	.add-input-endpoint-plus-rectangle {
		transition:
			fill var(--add-input-endpoint--transition-duration) ease,
			stroke var(--add-input-endpoint--transition-duration) ease;
		fill: var(--color-foreground-xlight);
		stroke: var(--svg-color, var(--color-primary));
	}

	.add-input-endpoint-plus-icon {
		stroke: none;
		transition: fill var(--add-input-endpoint--transition-duration) ease;
		fill: var(--svg-color, var(--color-primary));
	}

	.add-input-endpoint-connected-rectangle {
		transition:
			fill var(--add-input-endpoint--transition-duration) ease,
			stroke var(--add-input-endpoint--transition-duration) ease;
		fill: var(--color-foreground-xdark);
		stroke: var(--color-foreground-xdark);
	}

	&.rect-input-endpoint-hover {
		.add-input-endpoint-plus-rectangle {
			stroke: var(--svg-color, var(--color-primary));
		}

		.add-input-endpoint-plus-icon {
			fill: var(--svg-color, var(--color-primary));
		}
	}

	&.jtk-endpoint-connected:not(.add-input-endpoint-multiple) {
		.add-input-endpoint-unconnected {
			display: none;
		}

		&.rect-input-endpoint-hover {
			.add-input-endpoint-connected-rectangle {
				fill: var(--svg-color, var(--color-primary));
				stroke: var(--svg-color, var(--color-primary));
			}
		}
	}
}

.node-input-endpoint-label,
.node-output-endpoint-label {
	--node-endpoint-label--transition-duration: 0.15s;

	background-color: hsla(
		var(--color-canvas-background-h),
		var(--color-canvas-background-s),
		var(--color-canvas-background-l),
		0.85
	);
	border-radius: var(--border-radius-large);
	font-size: var(--font-size-3xs);
	padding: var(--spacing-5xs) var(--spacing-4xs);
	white-space: nowrap;
	transition: color var(--node-endpoint-label--transition-duration) ease;

	@each $node-type in $supplemental-node-types {
		&.node-connection-type-#{$node-type} {
			color: var(--node-type-supplemental-label-color);
		}
	}
}

.node-output-endpoint-label.node-connection-category-error {
	color: var(--color-node-error-output-text-color);
}

.node-output-endpoint-label {
	margin-left: calc(var(--endpoint-size-small) + var(--spacing-2xs));

	&--data {
		text-align: center;
		margin-top: calc(var(--spacing-l) * -1);
		margin-left: 0;
	}

	// Some nodes allow for dynamic connection labels
	// so we need to make sure the label does not overflow
	&.node-connection-type-main[data-endpoint-label-length] {
		max-width: calc(var(--stalk-size) - var(--endpoint-size-small) - var(--spacing-4xs));
		overflow: hidden;
		text-overflow: ellipsis;
		transform: translateY(-50%) !important;
		margin-left: var(--endpoint-size-small);
	}
}

.node-input-endpoint-label {
	text-align: right;
	margin-left: -25px;

	&--moved {
		margin-left: -40px;
	}

	&--data {
		text-align: center;
		margin-top: calc(var(--spacing-5xs) * -1);
		margin-left: 0;
	}
}

.hover-message.jtk-overlay {
	--hover-message-width: 110px;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-regular);
	color: var(--color-text-light);
	width: var(--hover-message-width);
	margin-left: calc(
		(var(--hover-message-width) / 2) + var(--stalk-size) + var(--plus-endpoint-box-size) +
			var(--spacing-2xs)
	);
	opacity: 0;
	pointer-events: none;
	&.small {
		margin-left: calc(
			(var(--hover-message-width) / 2) + var(--stalk-size) + var(--plus-endpoint-box-size-small) +
				var(--spacing-2xs)
		);
	}
	&.visible {
		pointer-events: all;
		opacity: 1;
	}
}

.long-stalk {
	--stalk-size: var(--stalk-long-size);
}
.ep-success {
	--stalk-size: var(--stalk-success-size);
}
.ep-success--without-label {
	--stalk-size: var(--stalk-success-size-without-label);
}

[data-endpoint-label-length='medium'] {
	--stalk-size: var(--stalk-medium-size);
}

[data-endpoint-label-length='large'] {
	--stalk-size: var(--stalk-large-size);
}
</style>
