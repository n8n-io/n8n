<template>
	<div :class="$style.subConnections">
		<div :class="$style.connections">
			<div
				v-for="connection in possibleConnections"
				:key="connection.type"
				:class="{
					[$style.connectionType]: true,
				}"
			>
				<span :class="$style.connectionLabel">{{ connection.displayName }}</span>
				<div
					v-on-click-outside="() => expandConnectionGroup(connection.type, false)"
					:class="{
						[$style.connectedNodesWrapper]: true,
						[$style.connectedNodesExpanded]: expandedGroups.includes(connection.type),
					}"
					@click="expandConnectionGroup(connection.type, true)"
				>
					<div
						:class="{
							[$style.connectedNodes]: true,
							[$style.connectedNodesMultiple]: connectedNodes[connection.type].length > 1,
						}"
						:style="`--nodes-length: ${connectedNodes[connection.type].length}`"
					>
						<div
							v-for="(node, index) in connectedNodes[connection.type]"
							:key="node.node.name"
							:class="$style.nodeWrapper"
							:style="`--node-index: ${index}`"
						>
							<n8n-tooltip
								:key="node.node.name"
								placement="top"
								:teleported="false"
								:offset="10"
								:disabled="!expandedGroups.includes(connection.type)"
							>
								<template #content>{{ node.node.name }}</template>

								<li
									:class="$style.connectedNode"
									data-test-id="floating-node"
									:data-node-name="node.node.name"
								>
									<NodeIcon
										:node-type="node.nodeType"
										:node-name="node.node.name"
										tooltip-position="top"
										:size="30"
										circle
									/>
								</li>
							</n8n-tooltip>
						</div>
						<div
							v-if="
								connectedNodes[connection.type].length >= 1 ? connection.maxConnections !== 1 : true
							"
							:class="$style.plusButton"
						>
							<n8n-icon-button
								size="large"
								icon="plus"
								type="tertiary"
								:class="$style.plusButtonButton"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, ref } from 'vue';
import { NodeHelpers } from 'n8n-workflow';
import NodeIcon from '@/components/NodeIcon.vue';
import type { ConnectionTypes, INodeInputConfiguration, INodeTypeDescription } from 'n8n-workflow';

interface Props {
	rootNode: INodeUi;
}

const props = defineProps<Props>();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const workflow = workflowsStore.getCurrentWorkflow();
const nodeType = nodeTypesStore.getNodeType(props.rootNode.type, props.rootNode.typeVersion);
const emit = defineEmits(['switchSelectedNode']);

interface NodeConfig {
	node: INodeUi;
	nodeType: INodeTypeDescription;
}

const expandedGroups = ref<ConnectionTypes[]>([]);

function getConnectionConfig(connectionType: ConnectionTypes) {
	return possibleConnections.find((c) => c.type === connectionType);
}

function expandConnectionGroup(connectionType: ConnectionTypes, isExpanded: boolean) {
	const connectionConfig = getConnectionConfig(connectionType);
	console.log('🚀 ~ toggleGroup ~ connectionConfig:', connectionConfig);
	if (connectionConfig?.maxConnections === 1) {
		// If the connection is a single connection, we don't need to expand the group
		return;
	}
	if (isExpanded) {
		expandedGroups.value = [...expandedGroups.value, connectionType];
	} else {
		expandedGroups.value = expandedGroups.value.filter((g) => g !== connectionType);
	}
}

function getINodesFromNames(names: string[]): NodeConfig[] {
	return names
		.map((name) => {
			const node = workflowsStore.getNodeByName(name);
			if (node) {
				const nodeType = nodeTypesStore.getNodeType(node.type);
				if (nodeType) {
					return { node, nodeType };
				}
			}
			return null;
		})
		.filter((n): n is NodeConfig => n !== null);
}

const connectedNodes = computed<Record<ConnectionTypes, NodeConfig[]>>(() => {
	return possibleConnections.reduce(
		(acc, connection) => {
			const nodes = getINodesFromNames(
				workflow.getParentNodes(props.rootNode.name, connection.type),
			);
			return { ...acc, [connection.type]: nodes };
		},
		{} as Record<ConnectionTypes, NodeConfig[]>,
	);
});

function getConnectionNodes(connectionType: ConnectionTypes) {
	const rootName = props.rootNode.name;
	return getINodesFromNames(workflow.getParentNodes(rootName, connectionType));
}
function isNodeInputConfiguration(
	connectionConfig: ConnectionTypes | INodeInputConfiguration,
): connectionConfig is INodeInputConfiguration {
	if (typeof connectionConfig === 'string') return false;

	return 'type' in connectionConfig;
}

function getPossibleSubInputConnections(): INodeInputConfiguration[] {
	const inputs = NodeHelpers.getNodeInputs(workflow, props.rootNode, nodeType!);

	const nonMainInputs = inputs.filter((input): input is INodeInputConfiguration => {
		if (!isNodeInputConfiguration(input)) return false;

		return input.type !== 'main';
	});
	console.log('🚀 ~ nonMainInputs ~ nonMainInputs:', nonMainInputs);

	return nonMainInputs;
}
const possibleConnections = getPossibleSubInputConnections();
</script>

<style lang="scss" module>
.subConnections {
	position: absolute;
	bottom: 35px;
	left: var(--spacing-s);
	right: var(--spacing-s);
	user-select: none;
}
.connections {
	display: flex;
	justify-content: space-between;
	width: 100%;
}
.connectionType {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.connectionLabel {
	margin-bottom: var(--spacing-s);
	// Disable text selection
	user-select: none;
}
.connectedNodesWrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-between;
}
.plusButton {
	position: absolute;
	top: 8px;
	right: -25px;

	&:not(:first-child) {
		opacity: 1;
		transform: translateX(calc((var(--nodes-length) - 1) * 45px * -1));
		right: 0;
		transition: transform 200ms ease-in;
		z-index: -1;
		// right: calc((var(--nodes-length) - 1) * 43px);
		.connectedNodesExpanded & {
			opacity: 1;
			right: -50px;
			transform: translateX(0%);
		}
	}
}
.connectedNodes {
	display: flex;
	justify-content: center;
	position: absolute;
	gap: var(--spacing-2xs);
}
.connectedNodesMultiple {
	transition: margin 200ms ease-in;
	margin-left: calc((var(--nodes-length) - 1) * 50px);

	.connectedNodesExpanded & {
		margin-left: -60px;
	}
}
.connectedNodesExpanded {
	z-index: 10;
	// Add filter drop shadow
	filter: drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.2));
}
.connections:has(.connectedNodesExpanded) .connectionType:not(:has(.connectedNodesExpanded)) {
	// filter: blur(5px);
	opacity: 0;
}
.connectedNode {
	border: var(--border-base);
	background-color: var(--color-canvas-node-background);
	border-radius: 100%;
	padding: var(--spacing-xs);
	cursor: pointer;
	pointer-events: all;
	transition: transform 200ms ease-in;
	position: relative;
	display: flex;
	justify-self: center;
	align-self: center;
}
.nodeWrapper {
	transition: transform 200ms ease-in;
	transform-origin: center;
	&:not(:first-child) {
		transform: translateX(calc(var(--node-index, 0) * -50px));
	}

	.connectedNodesExpanded & {
		transform: translateX(0);
		&:first-child:not(:last-child) {
			// transform: translateX(-28px);
		}
		&:not(:first-child) {
		}
	}
}
</style>
