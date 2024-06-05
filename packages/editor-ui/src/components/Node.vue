<template>
	<div
		v-if="data"
		:id="nodeId"
		:ref="data.name"
		:class="nodeWrapperClass"
		:style="nodeWrapperStyles"
		data-test-id="canvas-node"
		:data-name="data.name"
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
							<span v-html="$locale.baseText('node.thisIsATriggerNode')" />
						</template>
						<FontAwesomeIcon icon="bolt" size="lg" />
					</n8n-tooltip>
				</i>
				<div
					v-if="!data.disabled"
					:class="{ 'node-info-icon': true, 'shift-icon': shiftOutputCount }"
				>
					<div v-if="hasIssues && !hideNodeIssues" class="node-issues" data-test-id="node-issues">
						<n8n-tooltip :show-after="500" placement="bottom">
							<template #content>
								<TitledList :title="`${$locale.baseText('node.issues')}:`" :items="nodeIssues" />
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

				<div class="node-executing-info" :title="$locale.baseText('node.nodeIsExecuting')">
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
							{{ $locale.baseText('node.discovery.pinData.canvas') }}
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
					:disabled="data.disabled"
				/>
			</div>

			<div
				v-if="showDisabledLinethrough"
				:class="{
					'disabled-linethrough': true,
					success: !['unknown'].includes(nodeExecutionStatus) && workflowDataItems > 0,
				}"
			></div>
		</div>
		<div class="node-description">
			<div class="node-name" :title="nodeTitle">
				<p data-test-id="canvas-node-box-title">
					{{ nodeTitle }}
				</p>
				<p v-if="data.disabled">({{ $locale.baseText('node.disabled') }})</p>
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
				<n8n-icon-button
					v-if="!isConfigNode"
					data-test-id="execute-node-button"
					type="tertiary"
					text
					size="small"
					icon="play"
					:disabled="workflowRunning"
					:title="$locale.baseText('node.testStep')"
					@click="executeNode"
				/>
				<n8n-icon-button
					data-test-id="disable-node-button"
					type="tertiary"
					text
					size="small"
					icon="power-off"
					:title="nodeDisabledTitle"
					@click="toggleDisableNode"
				/>
				<n8n-icon-button
					data-test-id="delete-node-button"
					type="tertiary"
					size="small"
					text
					icon="trash"
					:title="$locale.baseText('node.delete')"
					@click="deleteNode"
				/>
				<n8n-icon-button
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

<script lang="ts">
import { type CSSProperties, defineComponent } from 'vue';
import { mapStores } from 'pinia';
import xss from 'xss';
import { useStorage } from '@/composables/useStorage';
import {
	CUSTOM_API_CALL_KEY,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG,
	MANUAL_TRIGGER_NODE_TYPE,
	NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS,
	NOT_DUPLICATABE_NODE_TYPES,
	SIMULATE_NODE_TYPE,
	SIMULATE_TRIGGER_NODE_TYPE,
	WAIT_TIME_UNLIMITED,
} from '@/constants';
import { nodeBase } from '@/mixins/nodeBase';
import type {
	ConnectionTypes,
	ExecutionSummary,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeTypeDescription,
	ITaskData,
	NodeOperationError,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';
import TitledList from '@/components/TitledList.vue';

import { get } from 'lodash-es';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import type { INodeUi, XYPosition } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { EnableNodeToggleCommand } from '@/models/history';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { type ContextMenuTarget, useContextMenu } from '@/composables/useContextMenu';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { usePinnedData } from '@/composables/usePinnedData';
import { useDeviceSupport } from 'n8n-design-system';
import { useDebounce } from '@/composables/useDebounce';

export default defineComponent({
	name: 'Node',
	components: {
		TitledList,
		FontAwesomeIcon,
		NodeIcon,
	},
	mixins: [nodeBase],
	props: {
		isProductionExecutionPreview: {
			type: Boolean,
			default: false,
		},
		disablePointerEvents: {
			type: Boolean,
			default: false,
		},
		hideNodeIssues: {
			type: Boolean,
			default: false,
		},
	},
	emits: {
		run: null,
		runWorkflow: null,
		removeNode: null,
		toggleDisableNode: null,
	},
	setup(props) {
		const workflowsStore = useWorkflowsStore();
		const contextMenu = useContextMenu();
		const externalHooks = useExternalHooks();
		const nodeHelpers = useNodeHelpers();
		const node = workflowsStore.getNodeByName(props.name);
		const pinnedData = usePinnedData(node);
		const deviceSupport = useDeviceSupport();
		const { callDebounced } = useDebounce();

		return {
			contextMenu,
			externalHooks,
			nodeHelpers,
			pinnedData,
			deviceSupport,
			callDebounced,
		};
	},
	data() {
		return {
			isTouchActive: false,
			nodeSubtitle: '',
			showTriggerNodeTooltip: false,
			pinDataDiscoveryTooltipVisible: false,
			dragging: false,
			unwatchWorkflowDataItems: () => {},
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useUIStore, useWorkflowsStore),
		showPinnedDataInfo(): boolean {
			return this.pinnedData.hasData.value && !this.isProductionExecutionPreview;
		},
		isDuplicatable(): boolean {
			if (!this.nodeType) return true;
			if (NOT_DUPLICATABE_NODE_TYPES.includes(this.nodeType.name)) return false;
			return (
				this.nodeType.maxNodes === undefined || this.sameTypeNodes.length < this.nodeType.maxNodes
			);
		},
		isScheduledGroup(): boolean {
			return this.nodeType?.group.includes('schedule') === true;
		},
		iconColorDefault(): string | undefined {
			if (this.isConfigNode) {
				return 'var(--color-text-base)';
			}
			return undefined;
		},
		nodeRunData(): ITaskData[] {
			if (!this.data) return [];

			return this.workflowsStore.getWorkflowResultDataByNodeName(this.data.name) ?? [];
		},
		hasIssues(): boolean {
			if (this.nodeExecutionStatus && ['crashed', 'error'].includes(this.nodeExecutionStatus))
				return true;
			if (this.pinnedData.hasData.value) return false;
			if (this.data?.issues !== undefined && Object.keys(this.data.issues).length) {
				return true;
			}
			return false;
		},
		workflowDataItems(): number {
			const workflowResultDataNode = this.nodeRunData;
			if (workflowResultDataNode === null) {
				return 0;
			}

			return workflowResultDataNode.length;
		},
		canvasOffsetPosition() {
			return this.uiStore.nodeViewOffsetPosition;
		},
		getTriggerNodeTooltip(): string | undefined {
			if (this.nodeType !== null && this.nodeType.hasOwnProperty('eventTriggerDescription')) {
				const nodeName = this.$locale.shortNodeType(this.nodeType.name);
				const { eventTriggerDescription } = this.nodeType;
				return this.$locale
					.nodeText()
					.eventTriggerDescription(nodeName, eventTriggerDescription ?? '');
			} else {
				return this.$locale.baseText('node.waitingForYouToCreateAnEventIn', {
					interpolate: {
						nodeType: this.nodeType ? getTriggerNodeServiceName(this.nodeType) : '',
					},
				});
			}
		},
		isPollingTypeNode(): boolean {
			return !!this.nodeType?.polling;
		},
		isExecuting(): boolean {
			if (!this.data) return false;
			return this.workflowsStore.isNodeExecuting(this.data.name);
		},
		isSingleActiveTriggerNode(): boolean {
			const nodes = this.workflowsStore.workflowTriggerNodes.filter((node: INodeUi) => {
				const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
				return nodeType && nodeType.eventTriggerDescription !== '' && !node.disabled;
			});

			return nodes.length === 1;
		},
		isManualTypeNode(): boolean {
			return this.data?.type === MANUAL_TRIGGER_NODE_TYPE;
		},
		isConfigNode(): boolean {
			if (!this.data) return false;
			return this.nodeTypesStore.isConfigNode(this.workflow, this.data, this.data.type ?? '');
		},
		isConfigurableNode(): boolean {
			if (!this.data) return false;

			return this.nodeTypesStore.isConfigurableNode(
				this.workflow,
				this.data,
				this.data?.type ?? '',
			);
		},
		isTriggerNode(): boolean {
			return this.data ? this.nodeTypesStore.isTriggerNode(this.data.type) : false;
		},
		isTriggerNodeTooltipEmpty(): boolean {
			return this.nodeType !== null ? this.nodeType.eventTriggerDescription === '' : false;
		},
		isNodeDisabled(): boolean | undefined {
			return this.node && this.node.disabled;
		},
		nodeType(): INodeTypeDescription | null {
			return this.data && this.nodeTypesStore.getNodeType(this.data.type, this.data.typeVersion);
		},
		node(): INodeUi | undefined {
			// same as this.data but reactive..
			return this.workflowsStore.nodesByName[this.name] as INodeUi | undefined;
		},
		sameTypeNodes(): INodeUi[] {
			return this.workflowsStore.allNodes.filter((node: INodeUi) => node.type === this.data?.type);
		},
		nodeWrapperClass() {
			const classes: Record<string, boolean> = {
				'node-wrapper': true,
				'node-wrapper--trigger': this.isTriggerNode,
				'node-wrapper--configurable': this.isConfigurableNode,
				'node-wrapper--config': this.isConfigNode,
			};

			if (this.outputs.length) {
				const outputTypes = NodeHelpers.getConnectionTypes(this.outputs);
				const otherOutputs = outputTypes.filter(
					(outputName) => outputName !== NodeConnectionType.Main,
				);
				if (otherOutputs.length) {
					otherOutputs.forEach((outputName) => {
						classes[`node-wrapper--connection-type-${outputName}`] = true;
					});
				}
			}

			return classes;
		},
		nodeWrapperStyles() {
			const styles: CSSProperties = {
				left: this.position[0] + 'px',
				top: this.position[1] + 'px',
			};

			if (this.node && this.nodeType) {
				const inputs =
					NodeHelpers.getNodeInputs(this.workflow, this.node, this.nodeType) ||
					([] as Array<ConnectionTypes | INodeInputConfiguration>);
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

				let outputs = [] as Array<ConnectionTypes | INodeOutputConfiguration>;
				if (this.workflow.nodes[this.node.name]) {
					outputs = NodeHelpers.getNodeOutputs(this.workflow, this.node, this.nodeType);
				}

				const outputTypes = NodeHelpers.getConnectionTypes(outputs);

				const mainOutputs = outputTypes.filter((output) => output === NodeConnectionType.Main);
				styles['--node-main-output-count'] = mainOutputs.length;
			}

			return styles;
		},
		nodeClass(): object {
			return {
				'node-box': true,
				disabled: this.data?.disabled,
				executing: this.isExecuting,
			};
		},
		nodeExecutionStatus(): string {
			const nodeExecutionRunData = this.workflowsStore.getWorkflowRunData?.[this.name];
			if (nodeExecutionRunData) {
				return nodeExecutionRunData.filter(Boolean)[0].executionStatus ?? '';
			}
			return '';
		},
		nodeIssues(): string[] {
			const issues: string[] = [];
			const nodeExecutionRunData = this.workflowsStore.getWorkflowRunData?.[this.name];
			if (nodeExecutionRunData) {
				nodeExecutionRunData.forEach((executionRunData) => {
					if (executionRunData?.error) {
						const { message, description } = executionRunData.error;
						const issue = `${message}${description ? ` (${description})` : ''}`;
						issues.push(xss(issue));
					}
				});
			}
			if (this.data?.issues !== undefined) {
				issues.push(...NodeHelpers.nodeIssuesToString(this.data.issues, this.data));
			}
			return issues;
		},
		nodeDisabledTitle(): string {
			return this.data?.disabled
				? this.$locale.baseText('node.enable')
				: this.$locale.baseText('node.disable');
		},
		position(): XYPosition {
			return this.node ? this.node.position : [0, 0];
		},
		showDisabledLinethrough(): boolean {
			return (
				!this.isConfigurableNode &&
				!!(this.data?.disabled && this.inputs.length === 1 && this.outputs.length === 1)
			);
		},
		shortNodeType(): string {
			return this.$locale.shortNodeType(this.data?.type ?? '');
		},
		nodeTitle(): string {
			if (this.data?.name === 'Start') {
				return this.$locale.headerText({
					key: 'headers.start.displayName',
					fallback: 'Start',
				});
			}

			return this.data?.name ?? '';
		},
		waiting(): string | undefined {
			const workflowExecution = this.workflowsStore.getWorkflowExecution as ExecutionSummary;

			if (workflowExecution?.waitTill) {
				const lastNodeExecuted = get(workflowExecution, 'data.resultData.lastNodeExecuted');
				if (this.name === lastNodeExecuted) {
					const waitDate = new Date(workflowExecution.waitTill);
					if (waitDate.toISOString() === WAIT_TIME_UNLIMITED) {
						return this.$locale.baseText(
							'node.theNodeIsWaitingIndefinitelyForAnIncomingWebhookCall',
						);
					}
					return this.$locale.baseText('node.nodeIsWaitingTill', {
						interpolate: {
							date: waitDate.toLocaleDateString(),
							time: waitDate.toLocaleTimeString(),
						},
					});
				}
			}

			return undefined;
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		nodeStyle() {
			const returnStyles: {
				[key: string]: string;
			} = {};

			let borderColor = '--color-foreground-xdark';

			if (this.isConfigurableNode || this.isConfigNode) {
				borderColor = '--color-foreground-dark';
			}

			if (this.data?.disabled) {
				borderColor = '--color-foreground-base';
			} else if (!this.isExecuting) {
				if (this.hasIssues && !this.hideNodeIssues) {
					// Do not set red border if there is an issue with the configuration node
					if (
						(this.nodeRunData?.[0]?.error as NodeOperationError)?.functionality !==
						'configuration-node'
					) {
						borderColor = '--color-danger';
						returnStyles['border-width'] = '2px';
						returnStyles['border-style'] = 'solid';
					}
				} else if (!!this.waiting || this.showPinnedDataInfo) {
					borderColor = '--color-canvas-node-pinned-border';
				} else if (this.nodeExecutionStatus === 'unknown') {
					borderColor = '--color-foreground-xdark';
				} else if (this.workflowDataItems) {
					returnStyles['border-width'] = '2px';
					returnStyles['border-style'] = 'solid';
					borderColor = '--color-success';
				}
			}

			returnStyles['border-color'] = `var(${borderColor})`;

			return returnStyles;
		},
		isSelected(): boolean {
			return (
				this.uiStore.getSelectedNodes.find((node: INodeUi) => node.name === this.data?.name) !==
				undefined
			);
		},
		shiftOutputCount(): boolean {
			return !!(this.nodeType && this.outputs.length > 2);
		},
		shouldShowTriggerTooltip(): boolean {
			return (
				!!this.node &&
				this.isTriggerNode &&
				!this.isPollingTypeNode &&
				!this.pinnedData.hasData.value &&
				!this.isNodeDisabled &&
				this.workflowRunning &&
				this.workflowDataItems === 0 &&
				this.isSingleActiveTriggerNode &&
				!this.isTriggerNodeTooltipEmpty &&
				!this.hasIssues &&
				!this.dragging
			);
		},
		isContextMenuOpen(): boolean {
			return (
				this.contextMenu.isOpen.value &&
				this.contextMenu.target.value.source === 'node-button' &&
				this.contextMenu.target.value.node.name === this.data?.name
			);
		},
		iconNodeType() {
			if (
				this.data?.type === SIMULATE_NODE_TYPE ||
				this.data?.type === SIMULATE_TRIGGER_NODE_TYPE
			) {
				const icon = this.data.parameters?.icon as string;
				const iconNodeType = this.workflow.expression.getSimpleParameterValue(
					this.data,
					icon,
					'internal',
					{},
				);
				if (iconNodeType && typeof iconNodeType === 'string') {
					return this.nodeTypesStore.getNodeType(iconNodeType);
				}
			}

			return this.nodeType;
		},
	},
	watch: {
		isActive(newValue, oldValue) {
			if (!newValue && oldValue) {
				this.setSubtitle();
			}
		},
		canvasOffsetPosition() {
			if (this.showTriggerNodeTooltip) {
				this.showTriggerNodeTooltip = false;
				setTimeout(() => {
					this.showTriggerNodeTooltip = this.shouldShowTriggerTooltip;
				}, 200);
			}

			if (this.pinDataDiscoveryTooltipVisible) {
				this.pinDataDiscoveryTooltipVisible = false;
				setTimeout(() => {
					this.pinDataDiscoveryTooltipVisible = true;
				}, 200);
			}
		},
		shouldShowTriggerTooltip(shouldShowTriggerTooltip) {
			if (shouldShowTriggerTooltip) {
				setTimeout(() => {
					this.showTriggerNodeTooltip = this.shouldShowTriggerTooltip;
				}, 2500);
			} else {
				this.showTriggerNodeTooltip = false;
			}
		},
		nodeRunData(newValue) {
			if (!this.data) {
				return;
			}

			this.$emit('run', { name: this.data.name, data: newValue, waiting: !!this.waiting });
		},
	},
	created() {
		const hasSeenPinDataTooltip = useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG).value;
		if (!hasSeenPinDataTooltip) {
			this.unwatchWorkflowDataItems = this.$watch('workflowDataItems', (dataItemsCount: number) => {
				this.showPinDataDiscoveryTooltip(dataItemsCount);
			});
		}
	},
	mounted() {
		setTimeout(() => {
			this.setSubtitle();
		}, 0);
		if (this.nodeRunData) {
			setTimeout(() => {
				this.$emit('run', {
					name: this.data?.name,
					data: this.nodeRunData,
					waiting: !!this.waiting,
				});
			}, 0);
		}
	},
	methods: {
		showPinDataDiscoveryTooltip(dataItemsCount: number): void {
			if (
				!this.isTriggerNode ||
				this.isManualTypeNode ||
				this.isScheduledGroup ||
				this.uiStore.isAnyModalOpen ||
				dataItemsCount === 0
			)
				return;

			useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG).value = 'true';

			this.pinDataDiscoveryTooltipVisible = true;
			this.unwatchWorkflowDataItems();
		},
		setSubtitle() {
			if (!this.data || !this.nodeType) return;
			// why is this not a computed property? because it's a very expensive operation
			// it requires expressions to resolve each subtitle...
			// and ends up bogging down the UI with big workflows, for example when pasting a workflow or even opening a node...
			// so we only update it when necessary (when node is mounted and when it's opened and closed (isActive))
			try {
				const nodeSubtitle =
					this.nodeHelpers.getNodeSubtitle(this.data, this.nodeType, this.workflow) ?? '';

				this.nodeSubtitle = nodeSubtitle.includes(CUSTOM_API_CALL_KEY) ? '' : nodeSubtitle;
			} catch (e) {
				// avoid breaking UI if expression error occurs
			}
		},
		disableNode() {
			if (this.data !== null) {
				this.nodeHelpers.disableNodes([this.data]);
				this.historyStore.pushCommandToUndo(
					new EnableNodeToggleCommand(
						this.data.name,
						!this.data.disabled,
						this.data.disabled === true,
					),
				);
				this.$telemetry.track('User clicked node hover button', {
					node_type: this.data.type,
					button_name: 'disable',
					workflow_id: this.workflowsStore.workflowId,
				});
			}
		},

		executeNode() {
			this.$emit('runWorkflow', this.data?.name, 'Node.executeNode');
			this.$telemetry.track('User clicked node hover button', {
				node_type: this.data?.type,
				button_name: 'execute',
				workflow_id: this.workflowsStore.workflowId,
			});
		},

		deleteNode() {
			this.$telemetry.track('User clicked node hover button', {
				node_type: this.data?.type,
				button_name: 'delete',
				workflow_id: this.workflowsStore.workflowId,
			});

			this.$emit('removeNode', this.data?.name);
		},

		toggleDisableNode(event: MouseEvent) {
			(event.currentTarget as HTMLButtonElement).blur();
			this.$telemetry.track('User clicked node hover button', {
				node_type: this.data?.type,
				button_name: 'disable',
				workflow_id: this.workflowsStore.workflowId,
			});
			this.$emit('toggleDisableNode', this.data);
		},

		onClick(event: MouseEvent) {
			void this.callDebounced(this.onClickDebounced, { debounceTime: 50, trailing: true }, event);
		},

		onClickDebounced(...args: unknown[]) {
			const event = args[0] as MouseEvent;
			const isDoubleClick = event.detail >= 2;
			if (isDoubleClick) {
				this.setNodeActive();
			} else {
				this.mouseLeftClick(event);
			}
		},

		setNodeActive() {
			this.ndvStore.activeNodeName = this.data ? this.data.name : '';
			this.pinDataDiscoveryTooltipVisible = false;
		},
		touchStart() {
			if (this.deviceSupport.isTouchDevice && !this.deviceSupport.isMacOs && !this.isTouchActive) {
				this.isTouchActive = true;
				setTimeout(() => {
					this.isTouchActive = false;
				}, 2000);
			}
		},
		openContextMenu(event: MouseEvent, source: ContextMenuTarget['source']) {
			if (this.data) {
				this.contextMenu.open(event, { source, node: this.data });
			}
		},
	},
});
</script>

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
	--node-height: calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 20px);

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
			background-color: var(--color-canvas-node-background);
			--color-background-node-icon-badge: var(--color-canvas-node-background);
			&.executing {
				background-color: $node-background-executing !important;

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
					background-color: $node-background-executing-other !important;
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

.disabled-linethrough {
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

.disabled-linethrough {
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
