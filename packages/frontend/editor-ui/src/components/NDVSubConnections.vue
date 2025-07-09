<script setup lang="ts">
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, ref, watch } from 'vue';
import { NodeHelpers } from 'n8n-workflow';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import NodeIcon from '@/components/NodeIcon.vue';
import TitledList from '@/components/TitledList.vue';
import type {
	NodeConnectionType,
	INodeInputConfiguration,
	INodeTypeDescription,
} from 'n8n-workflow';
import { useDebounce } from '@/composables/useDebounce';
import { OnClickOutside } from '@vueuse/components';
import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';

interface Props {
	rootNode: INodeUi;
}

const props = defineProps<Props>();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const nodeHelpers = useNodeHelpers();
const i18n = useI18n();
const { debounce } = useDebounce();
const emit = defineEmits<{
	switchSelectedNode: [nodeName: string];
	openConnectionNodeCreator: [
		nodeName: string,
		connectionType: NodeConnectionType,
		connectionIndex: number,
	];
}>();

interface NodeConfig {
	node: INodeUi;
	nodeType: INodeTypeDescription;
	issues: string[];
}

interface ConnectionContext {
	connectionType: NodeConnectionType;
	typeIndex: number;
	key: string;
}

const possibleConnections = ref<INodeInputConfiguration[]>([]);

const expandedGroups = ref<string[]>([]);
const shouldShowNodeInputIssues = ref(false);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.rootNode.type, props.rootNode.typeVersion),
);

const nodeData = computed(() => workflowsStore.getNodeByName(props.rootNode.name));
const ndvStore = useNDVStore();
const workflow = computed(() => workflowsStore.getCurrentWorkflow());

const nodeInputIssues = computed(() => {
	const issues = nodeHelpers.getNodeIssues(nodeType.value, props.rootNode, workflow.value, [
		'typeUnknown',
		'parameters',
		'credentials',
		'execution',
	]);
	return issues?.input ?? {};
});

const connectedNodes = computed<Record<string, NodeConfig[]>>(() => {
	const typeIndexCounters: Record<string, number> = {};

	return possibleConnections.value.reduce(
		(acc, connection) => {
			// Track index per connection type
			const typeIndex = typeIndexCounters[connection.type] ?? 0;
			typeIndexCounters[connection.type] = typeIndex + 1;

			// Get input-index-specific connections using the per-type index
			const nodeConnections =
				workflow.value.connectionsByDestinationNode[props.rootNode.name]?.[connection.type] ?? [];
			const inputConnections = nodeConnections[typeIndex] ?? [];
			const nodeNames = inputConnections.map((conn) => conn.node);
			const nodes = getINodesFromNames(nodeNames);

			// Use a unique key that combines connection type and per-type index
			const connectionKey = `${connection.type}-${typeIndex}`;
			return { ...acc, [connectionKey]: nodes };
		},
		{} as Record<string, NodeConfig[]>,
	);
});

function getConnectionContext(
	connection: INodeInputConfiguration,
	globalIndex: number,
): ConnectionContext {
	let typeIndex = 0;
	for (let i = 0; i < globalIndex; i++) {
		if (possibleConnections.value[i].type === connection.type) {
			typeIndex++;
		}
	}
	return {
		connectionType: connection.type,
		typeIndex,
		key: `${connection.type}-${typeIndex}`,
	};
}

function getConnectionKey(connection: INodeInputConfiguration, globalIndex: number): string {
	return getConnectionContext(connection, globalIndex).key;
}

function getConnectionConfig(connectionType: NodeConnectionType, typeIndex: number) {
	return possibleConnections.value
		.filter((connection) => connection.type === connectionType)
		.at(typeIndex);
}

function isMultiConnection(connectionContext: ConnectionContext) {
	const connectionConfig = getConnectionConfig(
		connectionContext.connectionType,
		connectionContext.typeIndex,
	);
	return connectionConfig?.maxConnections !== 1;
}

function shouldShowConnectionTooltip(connectionContext: ConnectionContext) {
	return (
		isMultiConnection(connectionContext) &&
		!expandedGroups.value.includes(connectionContext.connectionType)
	);
}

function expandConnectionGroup(connectionContext: ConnectionContext, isExpanded: boolean) {
	// If the connection is a single connection, we don't need to expand the group
	if (!isMultiConnection(connectionContext)) {
		return;
	}

	if (isExpanded) {
		expandedGroups.value = [...expandedGroups.value, connectionContext.connectionType];
	} else {
		expandedGroups.value = expandedGroups.value.filter(
			(g) => g !== connectionContext.connectionType,
		);
	}
}

function getINodesFromNames(names: string[]): NodeConfig[] {
	return names
		.map((name) => {
			const node = workflowsStore.getNodeByName(name);
			if (node) {
				const matchedNodeType = nodeTypesStore.getNodeType(node.type);
				if (matchedNodeType) {
					const issues = nodeHelpers.getNodeIssues(matchedNodeType, node, workflow.value);
					const stringifiedIssues = issues ? nodeHelpers.nodeIssuesToString(issues, node) : '';
					return { node, nodeType: matchedNodeType, issues: stringifiedIssues };
				}
			}
			return null;
		})
		.filter((n): n is NodeConfig => n !== null);
}

function hasInputIssues(connectionContext: ConnectionContext) {
	return (
		shouldShowNodeInputIssues.value &&
		(nodeInputIssues.value[connectionContext.connectionType] ?? []).length > 0
	);
}

function isNodeInputConfiguration(
	connectionConfig: NodeConnectionType | INodeInputConfiguration,
): connectionConfig is INodeInputConfiguration {
	if (typeof connectionConfig === 'string') return false;

	return 'type' in connectionConfig;
}

function getPossibleSubInputConnections(): INodeInputConfiguration[] {
	if (!nodeType.value || !props.rootNode) return [];

	const inputs = NodeHelpers.getNodeInputs(workflow.value, props.rootNode, nodeType.value);

	const nonMainInputs = inputs.filter((input): input is INodeInputConfiguration => {
		if (!isNodeInputConfiguration(input)) return false;

		return input.type !== 'main';
	});

	return nonMainInputs;
}

function onNodeClick(nodeName: string, connectionContext: ConnectionContext) {
	if (
		isMultiConnection(connectionContext) &&
		!expandedGroups.value.includes(connectionContext.connectionType)
	) {
		expandConnectionGroup(connectionContext, true);
		return;
	}

	emit('switchSelectedNode', nodeName);
}

function onPlusClick(connectionContext: ConnectionContext) {
	const connectionNodes = connectedNodes.value[connectionContext.key];
	if (
		isMultiConnection(connectionContext) &&
		!expandedGroups.value.includes(connectionContext.connectionType) &&
		connectionNodes.length >= 1
	) {
		expandConnectionGroup(connectionContext, true);
		return;
	}

	emit(
		'openConnectionNodeCreator',
		props.rootNode.name,
		connectionContext.connectionType,
		connectionContext.typeIndex,
	);
}

function showNodeInputsIssues() {
	shouldShowNodeInputIssues.value = false;
	// Reset animation
	setTimeout(() => {
		shouldShowNodeInputIssues.value = true;
	}, 0);
}

watch(
	[nodeData, ndvStore.activeNode],
	debounce(
		() =>
			setTimeout(() => {
				expandedGroups.value = [];
				possibleConnections.value = getPossibleSubInputConnections();
			}, 0),
		{ debounceTime: 1000 },
	),
	{ immediate: true },
);

defineExpose({
	showNodeInputsIssues,
});
</script>

<template>
	<div v-if="possibleConnections.length" :class="$style.container">
		<div
			:class="$style.connections"
			:style="`--possible-connections: ${possibleConnections.length}`"
		>
			<div
				v-for="(connection, index) in possibleConnections"
				:key="getConnectionKey(connection, index)"
				:data-test-id="`subnode-connection-group-${getConnectionKey(connection, index)}`"
			>
				<div :class="$style.connectionType">
					<span
						:class="{
							[$style.connectionLabel]: true,
							[$style.hasIssues]: hasInputIssues(getConnectionContext(connection, index)),
						}"
						v-text="`${connection.displayName}${connection.required ? ' *' : ''}`"
					/>
					<OnClickOutside
						@trigger="expandConnectionGroup(getConnectionContext(connection, index), false)"
					>
						<div
							ref="connectedNodesWrapper"
							:class="{
								[$style.connectedNodesWrapper]: true,
								[$style.connectedNodesWrapperExpanded]: expandedGroups.includes(connection.type),
							}"
							:style="`--nodes-length: ${connectedNodes[getConnectionKey(connection, index)].length}`"
							@click="expandConnectionGroup(getConnectionContext(connection, index), true)"
						>
							<div
								v-if="
									connectedNodes[getConnectionKey(connection, index)].length >= 1
										? connection.maxConnections !== 1
										: true
								"
								:class="{
									[$style.plusButton]: true,
									[$style.hasIssues]: hasInputIssues(getConnectionContext(connection, index)),
								}"
								@click="onPlusClick(getConnectionContext(connection, index))"
							>
								<n8n-tooltip
									placement="top"
									:teleported="true"
									:offset="10"
									:show-after="300"
									:disabled="
										shouldShowConnectionTooltip(getConnectionContext(connection, index)) &&
										connectedNodes[getConnectionKey(connection, index)].length >= 1
									"
								>
									<template #content>
										Add {{ connection.displayName }}
										<template v-if="hasInputIssues(getConnectionContext(connection, index))">
											<TitledList
												:title="`${i18n.baseText('node.issues')}:`"
												:items="nodeInputIssues[connection.type]"
											/>
										</template>
									</template>
									<n8n-icon-button
										size="medium"
										icon="plus"
										type="tertiary"
										:data-test-id="`add-subnode-${getConnectionKey(connection, index)}`"
									/>
								</n8n-tooltip>
							</div>
							<div
								v-if="connectedNodes[getConnectionKey(connection, index)].length > 0"
								:class="{
									[$style.connectedNodes]: true,
									[$style.connectedNodesMultiple]:
										connectedNodes[getConnectionKey(connection, index)].length > 1,
								}"
							>
								<div
									v-for="(node, nodeIndex) in connectedNodes[getConnectionKey(connection, index)]"
									:key="node.node.name"
									:class="{ [$style.nodeWrapper]: true, [$style.hasIssues]: node.issues }"
									data-test-id="floating-subnode"
									:data-node-name="node.node.name"
									:style="`--node-index: ${nodeIndex}`"
								>
									<n8n-tooltip
										:key="node.node.name"
										placement="top"
										:teleported="true"
										:offset="10"
										:show-after="300"
										:disabled="shouldShowConnectionTooltip(getConnectionContext(connection, index))"
									>
										<template #content>
											{{ node.node.name }}
											<template v-if="node.issues">
												<TitledList
													:title="`${i18n.baseText('node.issues')}:`"
													:items="node.issues"
												/>
											</template>
										</template>

										<div
											:class="$style.connectedNode"
											@click="onNodeClick(node.node.name, getConnectionContext(connection, index))"
										>
											<NodeIcon
												:node-type="node.nodeType"
												:node-name="node.node.name"
												tooltip-position="top"
												:size="20"
												circle
											/>
										</div>
									</n8n-tooltip>
								</div>
							</div>
						</div>
					</OnClickOutside>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@keyframes horizontal-shake {
	0% {
		transform: translateX(0);
	}
	25% {
		transform: translateX(5px);
	}
	50% {
		transform: translateX(-5px);
	}
	75% {
		transform: translateX(5px);
	}
	100% {
		transform: translateX(0);
	}
}
.container {
	--node-size: 45px;
	--plus-button-size: 30px;
	--animation-duration: 150ms;
	--collapsed-offset: 10px;
	padding-top: calc(var(--node-size) + var(--spacing-3xs));
}
.connections {
	// Make sure container has matching height if there's no connections
	// since the plus button is absolutely positioned
	min-height: calc(var(--node-size) + var(--spacing-m));
	position: absolute;
	bottom: calc((var(--node-size) / 2) * -1);
	left: 0;
	right: 0;
	user-select: none;
	justify-content: space-between;
	display: grid;
	grid-template-columns: repeat(var(--possible-connections), 1fr);
}
.connectionType {
	display: flex;
	flex-direction: column;
	align-items: center;
	transition: all calc((var(--animation-duration) - 50ms)) ease;
}
.connectionLabel {
	margin-bottom: var(--spacing-2xs);
	font-size: var(--font-size-2xs);
	user-select: none;
	text-wrap: nowrap;

	&.hasIssues {
		color: var(--color-danger);
	}
}
.connectedNodesWrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-between;
	position: relative;
}
.plusButton {
	transition: all var(--animation-duration) ease;
	position: absolute;
	top: var(--spacing-2xs);

	&.hasIssues {
		animation: horizontal-shake 500ms;
		button {
			--button-font-color: var(--color-danger);
			--button-border-color: var(--color-danger);
		}
	}

	&:not(:last-child) {
		z-index: 1;
		right: 100%;
		margin-right: calc((var(--plus-button-size) * -1) * 0.9);
		pointer-events: none;

		.connectedNodesWrapperExpanded & {
			// left: 100%;
			margin-right: var(--spacing-2xs);
			opacity: 1;
			pointer-events: all;
		}
	}
}

.connectedNodesMultiple {
	transition: all var(--animation-duration) ease;
}
.connectedNodesWrapperExpanded {
	z-index: 1;
}
// Hide all other connection groups when one is expanded
.connections:has(.connectedNodesWrapperExpanded)
	.connectionType:not(:has(.connectedNodesWrapperExpanded)) {
	opacity: 0;
	pointer-events: none;
	visibility: hidden;
}
.connectedNode {
	border: var(--border-base);
	background-color: var(--color-node-background);
	border-radius: 100%;
	padding: var(--spacing-xs);
	cursor: pointer;
	pointer-events: all;
	transition: all var(--animation-duration) ease;
	position: relative;
	display: flex;
	justify-self: center;
	align-self: center;
}
.connectedNodes {
	display: flex;
	justify-content: center;
	margin-right: calc(
		(var(--nodes-length) - 1) * (-1 * (var(--node-size) - var(--collapsed-offset)))
	);
	.connectedNodesWrapperExpanded & {
		margin-right: 0;
		// Negative margin to offset the absolutely positioned plus button
		// when the nodes are expanded to center the nodes
		margin-right: calc((var(--spacing-2xs) + var(--plus-button-size)) * -1);
	}
}
.nodeWrapper {
	transition: all var(--animation-duration) ease;
	transform-origin: center;
	z-index: 1;
	.connectedNodesWrapperExpanded &:not(:first-child) {
		margin-left: var(--spacing-2xs);
	}
	&.hasIssues {
		.connectedNode {
			border-width: calc(var(--border-width-base) * 2);
			border-color: var(--color-danger);
		}
	}

	&:not(:first-child) {
		transform: translateX(
			calc(var(--node-index) * (-1 * (var(--node-size) - var(--collapsed-offset))))
		);
	}

	.connectedNodesWrapperExpanded & {
		transform: translateX(0);
	}
}
</style>
