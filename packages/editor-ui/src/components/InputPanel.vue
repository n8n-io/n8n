<template>
	<RunData
		:node="currentNode"
		:workflow="workflow"
		:run-index="runIndex"
		:linked-runs="linkedRuns"
		:can-link-runs="!mappedNode && canLinkRuns"
		:too-much-data-title="$locale.baseText('ndv.input.tooMuchData.title')"
		:no-data-in-branch-message="$locale.baseText('ndv.input.noOutputDataInBranch')"
		:is-executing="isExecutingPrevious"
		:executing-message="$locale.baseText('ndv.input.executingPrevious')"
		:push-ref="pushRef"
		:override-outputs="connectedCurrentNodeOutputs"
		:mapping-enabled="isMappingEnabled"
		:distance-from-active="currentNodeDepth"
		:is-production-execution-preview="isProductionExecutionPreview"
		:is-pane-active="isPaneActive"
		pane-type="input"
		data-test-id="ndv-input-panel"
		@activate-pane="activatePane"
		@item-hover="$emit('itemHover', $event)"
		@link-run="onLinkRun"
		@unlink-run="onUnlinkRun"
		@run-change="onRunIndexChange"
		@table-mounted="$emit('tableMounted', $event)"
		@search="$emit('search', $event)"
	>
		<template #header>
			<div :class="$style.titleSection">
				<span :class="$style.title">{{ $locale.baseText('ndv.input') }}</span>
				<n8n-radio-buttons
					v-if="isActiveNodeConfig && !readOnly"
					:options="inputModes"
					:model-value="inputMode"
					@update:model-value="onInputModeChange"
				/>
			</div>
		</template>
		<template #input-select>
			<InputNodeSelect
				v-if="parentNodes.length && currentNodeName"
				:model-value="currentNodeName"
				:workflow="workflow"
				:nodes="parentNodes"
				@update:model-value="onInputNodeChange"
			/>
		</template>
		<template v-if="isMappingMode" #before-data>
			<!--
						Hide the run linking buttons for both input and ouput panels when in 'Mapping Mode' because the run indices wouldn't match.
						Although this is not the most elegant solution, it's straightforward and simpler than introducing a new props and logic to handle this.
				-->
			<component :is="'style'">button.linkRun { display: none }</component>
			<div :class="$style.mappedNode">
				<InputNodeSelect
					:model-value="mappedNode"
					:workflow="workflow"
					:nodes="rootNodesParents"
					@update:model-value="onMappedNodeSelected"
				/>
			</div>
		</template>
		<template #node-not-run>
			<div
				v-if="(isActiveNodeConfig && rootNode) || parentNodes.length"
				:class="$style.noOutputData"
			>
				<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{
					$locale.baseText('ndv.input.noOutputData.title')
				}}</n8n-text>
				<n8n-tooltip v-if="!readOnly" :visible="showDraggableHint && showDraggableHintWithDelay">
					<template #content>
						<div
							v-html="
								$locale.baseText('dataMapping.dragFromPreviousHint', {
									interpolate: { name: focusedMappableInput },
								})
							"
						></div>
					</template>
					<NodeExecuteButton
						type="secondary"
						hide-icon
						:transparent="true"
						:node-name="isActiveNodeConfig ? rootNode : currentNodeName ?? ''"
						:label="$locale.baseText('ndv.input.noOutputData.executePrevious')"
						telemetry-source="inputs"
						data-test-id="execute-previous-node"
						@execute="onNodeExecute"
					/>
				</n8n-tooltip>
				<n8n-text v-if="!readOnly" tag="div" size="small">
					{{ $locale.baseText('ndv.input.noOutputData.hint') }}
				</n8n-text>
			</div>
			<div v-else :class="$style.notConnected">
				<div>
					<WireMeUp />
				</div>
				<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{
					$locale.baseText('ndv.input.notConnected.title')
				}}</n8n-text>
				<n8n-text tag="div">
					{{ $locale.baseText('ndv.input.notConnected.message') }}
					<a
						href="https://docs.n8n.io/workflows/connections/"
						target="_blank"
						@click="onConnectionHelpClick"
					>
						{{ $locale.baseText('ndv.input.notConnected.learnMore') }}
					</a>
				</n8n-text>
			</div>
		</template>

		<template #no-output-data>
			<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{
				$locale.baseText('ndv.input.noOutputData')
			}}</n8n-text>
		</template>

		<template #recovered-artificial-output-data>
			<div :class="$style.recoveredOutputData">
				<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{
					$locale.baseText('executionDetails.executionFailed.recoveredNodeTitle')
				}}</n8n-text>
				<n8n-text>
					{{ $locale.baseText('executionDetails.executionFailed.recoveredNodeMessage') }}
				</n8n-text>
			</div>
		</template>
	</RunData>
</template>

<script lang="ts">
import type { INodeUi } from '@/Interface';
import {
	CRON_NODE_TYPE,
	INTERVAL_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	START_NODE_TYPE,
} from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type {
	ConnectionTypes,
	IConnectedNode,
	INodeOutputConfiguration,
	INodeTypeDescription,
	Workflow,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { defineComponent, type PropType } from 'vue';
import InputNodeSelect from './InputNodeSelect.vue';
import NodeExecuteButton from './NodeExecuteButton.vue';
import RunData from './RunData.vue';
import WireMeUp from './WireMeUp.vue';

type MappingMode = 'debugging' | 'mapping';

export default defineComponent({
	name: 'InputPanel',
	components: { RunData, NodeExecuteButton, WireMeUp, InputNodeSelect },
	props: {
		currentNodeName: {
			type: String,
		},
		runIndex: {
			type: Number,
			required: true,
		},
		linkedRuns: {
			type: Boolean,
		},
		workflow: {
			type: Object as PropType<Workflow>,
			required: true,
		},
		canLinkRuns: {
			type: Boolean,
		},
		pushRef: {
			type: String,
		},
		readOnly: {
			type: Boolean,
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false,
		},
		isPaneActive: {
			type: Boolean,
			default: false,
		},
	},
	emits: [
		'itemHover',
		'tableMounted',
		'linkRun',
		'unlinkRun',
		'runChange',
		'search',
		'changeInputNode',
		'execute',
		'activatePane',
	],
	data() {
		return {
			showDraggableHintWithDelay: false,
			draggableHintShown: false,
			inputMode: 'debugging' as MappingMode,
			mappedNode: null as string | null,
			inputModes: [
				{ value: 'mapping', label: this.$locale.baseText('ndv.input.mapping') },
				{ value: 'debugging', label: this.$locale.baseText('ndv.input.debugging') },
			],
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useWorkflowsStore, useUIStore),
		focusedMappableInput(): string {
			return this.ndvStore.focusedMappableInput;
		},
		isUserOnboarded(): boolean {
			return this.ndvStore.isMappingOnboarded;
		},
		isMappingMode(): boolean {
			return this.isActiveNodeConfig && this.inputMode === 'mapping';
		},
		showDraggableHint(): boolean {
			const toIgnore = [
				START_NODE_TYPE,
				MANUAL_TRIGGER_NODE_TYPE,
				CRON_NODE_TYPE,
				INTERVAL_NODE_TYPE,
			];
			if (!this.currentNode || toIgnore.includes(this.currentNode.type)) {
				return false;
			}

			return !!this.focusedMappableInput && !this.isUserOnboarded;
		},
		isActiveNodeConfig(): boolean {
			let inputs = this.activeNodeType?.inputs ?? [];
			let outputs = this.activeNodeType?.outputs ?? [];
			if (this.activeNode !== null && this.workflow !== null) {
				const node = this.workflow.getNode(this.activeNode.name);
				inputs = NodeHelpers.getNodeInputs(this.workflow, node!, this.activeNodeType!);
				outputs = NodeHelpers.getNodeOutputs(this.workflow, node!, this.activeNodeType!);
			} else {
				// If we can not figure out the node type we set no outputs
				if (!Array.isArray(inputs)) {
					inputs = [] as ConnectionTypes[];
				}
				if (!Array.isArray(outputs)) {
					outputs = [] as ConnectionTypes[];
				}
			}

			if (
				inputs.length === 0 ||
				(inputs.every((input) => this.filterOutConnectionType(input, NodeConnectionType.Main)) &&
					outputs.find((output) => this.filterOutConnectionType(output, NodeConnectionType.Main)))
			) {
				return true;
			}

			return false;
		},
		isMappingEnabled(): boolean {
			if (this.readOnly) return false;

			// Mapping is only enabled in mapping mode for config nodes and if node to map is selected
			if (this.isActiveNodeConfig) return this.isMappingMode && this.mappedNode !== null;

			return true;
		},
		isExecutingPrevious(): boolean {
			if (!this.workflowRunning) {
				return false;
			}
			const triggeredNode = this.workflowsStore.executedNode;
			const executingNode = this.workflowsStore.executingNode;

			if (
				this.activeNode &&
				triggeredNode === this.activeNode.name &&
				!this.workflowsStore.isNodeExecuting(this.activeNode.name)
			) {
				return true;
			}

			if (executingNode.length || triggeredNode) {
				return !!this.parentNodes.find(
					(node) => this.workflowsStore.isNodeExecuting(node.name) || node.name === triggeredNode,
				);
			}
			return false;
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},

		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},

		rootNode(): string {
			const workflow = this.workflow;
			const rootNodes = workflow.getChildNodes(this.activeNode?.name ?? '', 'ALL_NON_MAIN');

			return rootNodes[0];
		},
		rootNodesParents() {
			const workflow = this.workflow;
			const parentNodes = [...workflow.getParentNodes(this.rootNode, 'main')]
				.reverse()
				.map((parent): IConnectedNode => ({ name: parent, depth: 1, indicies: [] }));

			return parentNodes;
		},
		currentNode(): INodeUi | null {
			if (this.isActiveNodeConfig) {
				// if we're mapping node we want to show the output of the mapped node
				if (this.mappedNode) {
					return this.workflowsStore.getNodeByName(this.mappedNode);
				}

				// in debugging mode data does get set manually and is only for debugging
				// so we want to force the node to be the active node to make sure we show the correct data
				return this.activeNode;
			}

			return this.workflowsStore.getNodeByName(this.currentNodeName ?? '');
		},
		connectedCurrentNodeOutputs(): number[] | undefined {
			const search = this.parentNodes.find(({ name }) => name === this.currentNodeName);
			if (search) {
				return search.indicies;
			}
			return undefined;
		},
		parentNodes(): IConnectedNode[] {
			if (!this.activeNode) {
				return [];
			}
			const nodes = this.workflow.getParentNodesByDepth(this.activeNode.name);

			return nodes.filter(
				({ name }, i) =>
					this.activeNode &&
					name !== this.activeNode.name &&
					nodes.findIndex((node) => node.name === name) === i,
			);
		},
		currentNodeDepth(): number {
			const node = this.parentNodes.find(
				(parent) => this.currentNode && parent.name === this.currentNode.name,
			);
			return node ? node.depth : -1;
		},
		activeNodeType(): INodeTypeDescription | null {
			if (!this.activeNode) return null;

			return this.nodeTypesStore.getNodeType(this.activeNode.type, this.activeNode.typeVersion);
		},
		isMultiInputNode(): boolean {
			return this.activeNodeType !== null && this.activeNodeType.inputs.length > 1;
		},
	},
	watch: {
		inputMode: {
			handler(val) {
				this.onRunIndexChange(-1);
				if (val === 'mapping') {
					this.onUnlinkRun();
					this.mappedNode = this.rootNodesParents[0]?.name ?? null;
				} else {
					this.mappedNode = null;
				}
			},
			immediate: true,
		},
		showDraggableHint(curr: boolean, prev: boolean) {
			if (curr && !prev) {
				setTimeout(() => {
					if (this.draggableHintShown) {
						return;
					}
					this.showDraggableHintWithDelay = this.showDraggableHint;
					if (this.showDraggableHintWithDelay) {
						this.draggableHintShown = true;

						this.$telemetry.track('User viewed data mapping tooltip', {
							type: 'unexecuted input pane',
						});
					}
				}, 1000);
			} else if (!curr) {
				this.showDraggableHintWithDelay = false;
			}
		},
	},
	methods: {
		filterOutConnectionType(
			item: ConnectionTypes | INodeOutputConfiguration,
			type: ConnectionTypes,
		) {
			if (!item) return false;

			return typeof item === 'string' ? item !== type : item.type !== type;
		},
		onInputModeChange(val: MappingMode) {
			this.inputMode = val;
		},
		onMappedNodeSelected(val: string) {
			this.mappedNode = val;

			this.onRunIndexChange(0);
			this.onUnlinkRun();
		},
		onNodeExecute() {
			this.$emit('execute');
			if (this.activeNode) {
				this.$telemetry.track('User clicked ndv button', {
					node_type: this.activeNode.type,
					workflow_id: this.workflowsStore.workflowId,
					push_ref: this.pushRef,
					pane: 'input',
					type: 'executePrevious',
				});
			}
		},
		onRunIndexChange(run: number) {
			this.$emit('runChange', run);
		},
		onLinkRun() {
			this.$emit('linkRun');
		},
		onUnlinkRun() {
			this.$emit('unlinkRun');
		},
		onInputNodeChange(value: string) {
			const index = this.parentNodes.findIndex((node) => node.name === value) + 1;
			this.$emit('changeInputNode', value, index);
		},
		onConnectionHelpClick() {
			if (this.activeNode) {
				this.$telemetry.track('User clicked ndv link', {
					node_type: this.activeNode.type,
					workflow_id: this.workflowsStore.workflowId,
					push_ref: this.pushRef,
					pane: 'input',
					type: 'not-connected-help',
				});
			}
		},
		activatePane() {
			this.$emit('activatePane');
		},
	},
});
</script>

<style lang="scss" module>
.mappedNode {
	padding: 0 var(--spacing-s) var(--spacing-s);
}

.titleSection {
	display: flex;
	max-width: 300px;
	align-items: center;

	> * {
		margin-right: var(--spacing-2xs);
	}
}
.inputModeTab {
	margin-left: auto;
}
.noOutputData {
	max-width: 180px;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.recoveredOutputData {
	margin: auto;
	max-width: 250px;
	text-align: center;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}
}

.notConnected {
	max-width: 300px;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.title {
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 3px;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
}
</style>
