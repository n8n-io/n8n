<template>
	<RunData
		:nodeUi="currentNode"
		:runIndex="runIndex"
		:linkedRuns="linkedRuns"
		:canLinkRuns="canLinkRuns"
		:tooMuchDataTitle="$locale.baseText('ndv.input.tooMuchData.title')"
		:noDataInBranchMessage="$locale.baseText('ndv.input.noOutputDataInBranch')"
		:isExecuting="isExecutingPrevious"
		:executingMessage="$locale.baseText('ndv.input.executingPrevious')"
		:sessionId="sessionId"
		:overrideOutputs="connectedCurrentNodeOutputs"
		:mappingEnabled="!readOnly"
		:showMappingHint="draggableHintShown"
		:distanceFromActive="currentNodeDepth"
		:isProductionExecutionPreview="isProductionExecutionPreview"
		paneType="input"
		@itemHover="$emit('itemHover', $event)"
		@linkRun="onLinkRun"
		@unlinkRun="onUnlinkRun"
		@runChange="onRunIndexChange"
		@tableMounted="$emit('tableMounted', $event)"
		data-test-id="ndv-input-panel"
	>
		<template #header>
			<div :class="$style.titleSection">
				<n8n-select
					v-if="parentNodes.length"
					:popper-append-to-body="true"
					size="small"
					:value="currentNodeName"
					@input="onSelect"
					:no-data-text="$locale.baseText('ndv.input.noNodesFound')"
					:placeholder="$locale.baseText('ndv.input.parentNodes')"
					filterable
					data-test-id="ndv-input-select"
				>
					<template #prepend>
						<span :class="$style.title">{{ $locale.baseText('ndv.input') }}</span>
					</template>
					<n8n-option
						v-for="node of parentNodes"
						:value="node.name"
						:key="node.name"
						class="node-option"
						:label="`${truncate(node.name)} ${getMultipleNodesText(node.name)}`"
						data-test-id="ndv-input-option"
					>
						{{ truncate(node.name) }}&nbsp;
						<span v-if="getMultipleNodesText(node.name)">{{
							getMultipleNodesText(node.name)
						}}</span>
						<span v-else>{{
							$locale.baseText('ndv.input.nodeDistance', { adjustToNumber: node.depth })
						}}</span>
					</n8n-option>
				</n8n-select>
				<span v-else :class="$style.title">{{ $locale.baseText('ndv.input') }}</span>
			</div>
		</template>

		<template #node-not-run>
			<div :class="$style.noOutputData" v-if="parentNodes.length">
				<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{
					$locale.baseText('ndv.input.noOutputData.title')
				}}</n8n-text>
				<n8n-tooltip
					v-if="!readOnly"
					:manual="true"
					:value="showDraggableHint && showDraggableHintWithDelay"
				>
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
						:transparent="true"
						:nodeName="currentNodeName"
						:label="$locale.baseText('ndv.input.noOutputData.executePrevious')"
						@execute="onNodeExecute"
						telemetrySource="inputs"
						data-test-id="execute-previous-node"
					/>
				</n8n-tooltip>
				<n8n-text v-if="!readOnly" tag="div" size="small">
					{{ $locale.baseText('ndv.input.noOutputData.hint') }}
				</n8n-text>
			</div>
			<div :class="$style.notConnected" v-else>
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

		<template #recovered-artifical-output-data>
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
import { INodeUi } from '@/Interface';
import { IConnectedNode, INodeTypeDescription, Workflow } from 'n8n-workflow';
import RunData from './RunData.vue';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';
import NodeExecuteButton from './NodeExecuteButton.vue';
import WireMeUp from './WireMeUp.vue';
import {
	CRON_NODE_TYPE,
	INTERVAL_NODE_TYPE,
	LOCAL_STORAGE_MAPPING_FLAG,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	START_NODE_TYPE,
} from '@/constants';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';
import { useNodeTypesStore } from '@/stores/nodeTypes';

export default mixins(workflowHelpers).extend({
	name: 'InputPanel',
	components: { RunData, NodeExecuteButton, WireMeUp },
	props: {
		currentNodeName: {
			type: String,
		},
		runIndex: {
			type: Number,
		},
		linkedRuns: {
			type: Boolean,
		},
		workflow: {},
		canLinkRuns: {
			type: Boolean,
		},
		sessionId: {
			type: String,
		},
		readOnly: {
			type: Boolean,
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			showDraggableHintWithDelay: false,
			draggableHintShown: false,
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useWorkflowsStore),
		focusedMappableInput(): string {
			return this.ndvStore.focusedMappableInput;
		},
		isUserOnboarded(): boolean {
			return window.localStorage.getItem(LOCAL_STORAGE_MAPPING_FLAG) === 'true';
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
		isExecutingPrevious(): boolean {
			if (!this.workflowRunning) {
				return false;
			}
			const triggeredNode = this.workflowsStore.executedNode;
			const executingNode = this.workflowsStore.executingNode;
			if (
				this.activeNode &&
				triggeredNode === this.activeNode.name &&
				this.activeNode.name !== executingNode
			) {
				return true;
			}

			if (executingNode || triggeredNode) {
				return !!this.parentNodes.find(
					(node) => node.name === executingNode || node.name === triggeredNode,
				);
			}
			return false;
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		currentWorkflow(): Workflow {
			return this.workflow as Workflow;
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		currentNode(): INodeUi | null {
			return this.workflowsStore.getNodeByName(this.currentNodeName);
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
			const nodes: IConnectedNode[] = (this.workflow as Workflow).getParentNodesByDepth(
				this.activeNode.name,
			);

			return nodes.filter(
				({ name }, i) =>
					this.activeNode &&
					name !== this.activeNode.name &&
					nodes.findIndex((node) => node.name === name) === i,
			);
		},
		currentNodeDepth(): number {
			const node = this.parentNodes.find(
				(node) => this.currentNode && node.name === this.currentNode.name,
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
	methods: {
		getMultipleNodesText(nodeName?: string): string {
			if (
				!nodeName ||
				!this.isMultiInputNode ||
				!this.activeNode ||
				this.activeNodeType === null ||
				this.activeNodeType.inputNames === undefined
			)
				return '';

			const activeNodeConnections =
				this.currentWorkflow.connectionsByDestinationNode[this.activeNode.name].main || [];
			// Collect indexes of connected nodes
			const connectedInputIndexes = activeNodeConnections.reduce((acc: number[], node, index) => {
				if (node[0] && node[0].node === nodeName) return [...acc, index];
				return acc;
			}, []);

			// Match connected input indexes to their names specified by active node
			const connectedInputs = connectedInputIndexes.map(
				(inputIndex) =>
					this.activeNodeType &&
					this.activeNodeType.inputNames &&
					this.activeNodeType.inputNames[inputIndex],
			);

			if (connectedInputs.length === 0) return '';

			return `(${connectedInputs.join(' & ')})`;
		},
		onNodeExecute() {
			this.$emit('execute');
			if (this.activeNode) {
				this.$telemetry.track('User clicked ndv button', {
					node_type: this.activeNode.type,
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.sessionId,
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
		onSelect(value: string) {
			const index = this.parentNodes.findIndex((node) => node.name === value) + 1;
			this.$emit('select', value, index);
		},
		onConnectionHelpClick() {
			if (this.activeNode) {
				this.$telemetry.track('User clicked ndv link', {
					node_type: this.activeNode.type,
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.sessionId,
					pane: 'input',
					type: 'not-connected-help',
				});
			}
		},
		truncate(nodeName: string) {
			const truncated = nodeName.substring(0, 30);
			if (truncated.length < nodeName.length) {
				return `${truncated}...`;
			}
			return truncated;
		},
	},
	watch: {
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
});
</script>

<style lang="scss" module>
.titleSection {
	display: flex;
	max-width: 300px;

	> * {
		margin-right: var(--spacing-2xs);
	}
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

<style lang="scss" scoped>
.node-option {
	font-weight: var(--font-weight-regular) !important;

	span {
		color: var(--color-text-light);
	}

	&.selected > span {
		color: var(--color-primary);
	}
}
</style>
