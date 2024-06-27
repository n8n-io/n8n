import { useI18n } from '@/composables/useI18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { Ref } from 'vue';
import { computed } from 'vue';
import type {
	CanvasConnection,
	CanvasConnectionPort,
	CanvasElement,
	CanvasElementData,
} from '@/types';
import {
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
} from '@/utils/canvasUtilsV2';
import type { ExecutionStatus, INodeExecutionData, Workflow } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import xss from 'xss';

export function useCanvasMapping({
	workflow,
	workflowObject,
}: {
	workflow: Ref<IWorkflowDb>;
	workflowObject: Ref<Workflow>;
}) {
	const locale = useI18n();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	const renderTypeByNodeType = computed(
		() =>
			workflow.value.nodes.reduce<Record<string, CanvasElementData['renderType']>>((acc, node) => {
				let renderType: CanvasElementData['renderType'] = 'default';
				switch (true) {
					case nodeTypesStore.isTriggerNode(node.type):
						renderType = 'trigger';
						break;
					case nodeTypesStore.isConfigNode(workflowObject.value, node, node.type):
						renderType = 'configuration';
						break;
					case nodeTypesStore.isConfigurableNode(workflowObject.value, node, node.type):
						renderType = 'configurable';
						break;
				}

				acc[node.type] = renderType;
				return acc;
			}, {}) ?? {},
	);

	const nodeInputsById = computed(() =>
		workflow.value.nodes.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
			const workflowObjectNode = workflowObject.value.getNode(node.name);

			acc[node.id] =
				workflowObjectNode && nodeTypeDescription
					? mapLegacyEndpointsToCanvasConnectionPort(
							NodeHelpers.getNodeInputs(
								workflowObject.value,
								workflowObjectNode,
								nodeTypeDescription,
							),
						)
					: [];

			return acc;
		}, {}),
	);

	const nodeOutputsById = computed(() =>
		workflow.value.nodes.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
			const workflowObjectNode = workflowObject.value.getNode(node.name);

			acc[node.id] =
				workflowObjectNode && nodeTypeDescription
					? mapLegacyEndpointsToCanvasConnectionPort(
							NodeHelpers.getNodeOutputs(
								workflowObject.value,
								workflowObjectNode,
								nodeTypeDescription,
							),
						)
					: [];

			return acc;
		}, {}),
	);

	const nodePinnedDataById = computed(() =>
		workflow.value.nodes.reduce<Record<string, INodeExecutionData[] | undefined>>((acc, node) => {
			acc[node.id] = workflowsStore.pinDataByNodeName(node.name);
			return acc;
		}, {}),
	);

	const nodeExecutionStatusById = computed(() =>
		workflow.value.nodes.reduce<Record<string, ExecutionStatus>>((acc, node) => {
			acc[node.id] =
				workflowsStore.getWorkflowRunData?.[node.name]?.filter(Boolean)[0].executionStatus ?? 'new';
			return acc;
		}, {}),
	);

	const nodeIssuesById = computed(() =>
		workflow.value.nodes.reduce<Record<string, string[]>>((acc, node) => {
			const issues: string[] = [];
			const nodeExecutionRunData = workflowsStore.getWorkflowRunData?.[node.name];
			if (nodeExecutionRunData) {
				nodeExecutionRunData.forEach((executionRunData) => {
					if (executionRunData?.error) {
						const { message, description } = executionRunData.error;
						const issue = `${message}${description ? ` (${description})` : ''}`;
						issues.push(xss(issue));
					}
				});
			}

			if (node?.issues !== undefined) {
				issues.push(...NodeHelpers.nodeIssuesToString(node.issues, node));
			}

			console.log(node.name, issues);

			acc[node.id] = issues;

			return acc;
		}, {}),
	);

	const nodeHasIssuesById = computed(() =>
		workflow.value.nodes.reduce<Record<string, boolean>>((acc, node) => {
			if (['crashed', 'error'].includes(nodeExecutionStatusById.value[node.id])) {
				acc[node.id] = true;
			} else if (nodePinnedDataById.value[node.id]) {
				acc[node.id] = false;
			} else if (node?.issues !== undefined && Object.keys(node.issues).length) {
				acc[node.id] = true;
			} else {
				acc[node.id] = false;
			}

			return acc;
		}, {}),
	);

	const elements = computed<CanvasElement[]>(() => [
		...workflow.value.nodes.map<CanvasElement>((node) => {
			const inputConnections = workflowObject.value.connectionsByDestinationNode[node.name] ?? {};
			const outputConnections = workflowObject.value.connectionsBySourceNode[node.name] ?? {};

			const data: CanvasElementData = {
				id: node.id,
				type: node.type,
				typeVersion: node.typeVersion,
				disabled: !!node.disabled,
				inputs: nodeInputsById.value[node.id] ?? [],
				outputs: nodeOutputsById.value[node.id] ?? [],
				connections: {
					input: inputConnections,
					output: outputConnections,
				},
				issues: nodeIssuesById.value[node.id],
				hasIssues: nodeHasIssuesById.value[node.id],
				pinnedData: nodePinnedDataById.value[node.id],
				executionStatus: nodeExecutionStatusById.value[node.id],
				renderType: renderTypeByNodeType.value[node.type] ?? 'default',
			};

			console.log(data);

			return {
				id: node.id,
				label: node.name,
				type: 'canvas-node',
				position: { x: node.position[0], y: node.position[1] },
				data,
			};
		}),
	]);

	const connections = computed<CanvasConnection[]>(() => {
		const mappedConnections = mapLegacyConnectionsToCanvasConnections(
			workflow.value.connections ?? [],
			workflow.value.nodes ?? [],
		);

		return mappedConnections.map((connection) => {
			const type = getConnectionType(connection);
			const label = getConnectionLabel(connection);

			return {
				...connection,
				type,
				label,
			};
		});
	});

	function getConnectionType(_: CanvasConnection): string {
		return 'canvas-edge';
	}

	function getConnectionLabel(connection: CanvasConnection): string {
		const pinData = workflow.value.pinData?.[connection.data?.fromNodeName ?? ''];

		if (pinData?.length) {
			return locale.baseText('ndv.output.items', {
				adjustToNumber: pinData.length,
				interpolate: { count: String(pinData.length) },
			});
		}

		return '';
	}

	return {
		connections,
		elements,
	};
}
