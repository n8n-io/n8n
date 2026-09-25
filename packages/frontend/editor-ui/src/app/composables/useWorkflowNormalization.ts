import type { IConnections, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers, resolveNodeWebhookId } from 'n8n-workflow';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { FORM_TRIGGER_NODE_TYPE, MCP_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/app/constants';
import { ensureNodePosition, sanitizeConnections } from '@/app/utils/workflowUtils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';

export interface NormalizedWorkflowData {
	nodes: INodeUi[];
	connections: IConnections;
}

/**
 * Node and connection normalization shared by every surface that hydrates a
 * workflow document store from raw workflow data (editor workspace
 * initialization, execution preview, ...).
 *
 * Reads from the node types and credentials stores but never writes global
 * workflow state — safe to use against any document store instance.
 */
export function useWorkflowNormalization() {
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();

	function requireNodeTypeDescription(
		type: INodeUi['type'],
		version?: INodeUi['typeVersion'],
	): INodeTypeDescription {
		return (
			nodeTypesStore.getNodeType(type, version) ??
			nodeTypesStore.communityNodeType(type)?.nodeDescription ?? {
				properties: [],
				displayName: type,
				name: type,
				group: [],
				description: '',
				version: version ?? 1,
				defaults: {},
				inputs: [],
				outputs: [],
			}
		);
	}

	function resolveNodeParameters(node: INodeUi, nodeTypeDescription: INodeTypeDescription) {
		const nodeParameters = NodeHelpers.getNodeParameters(
			nodeTypeDescription?.properties ?? [],
			node.parameters,
			true,
			false,
			node,
			nodeTypeDescription,
		);
		node.parameters = nodeParameters ?? {};
	}

	function resolveNodeWebhook(node: INodeUi, nodeTypeDescription: INodeTypeDescription) {
		resolveNodeWebhookId(node, nodeTypeDescription);

		// if it's a webhook and the path is empty set the UUID as the default path
		if (
			[WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, MCP_TRIGGER_NODE_TYPE].includes(node.type) &&
			node.parameters.path === ''
		) {
			node.parameters.path = node.webhookId as string;
		}
	}

	/**
	 * Normalizes raw workflow data for rendering: drops nodes with a missing
	 * type, coerces node positions, matches credentials, resolves parameters
	 * and webhook ids for installed node types, and sanitizes connections
	 * against the surviving node names.
	 */
	function normalizeWorkflowData(
		data: Pick<IWorkflowDb, 'nodes' | 'connections'>,
	): NormalizedWorkflowData {
		// Filter out nodes with missing type to prevent canvas rendering crashes
		const validNodes = data.nodes
			.filter((node) => !!node.type)
			.map((node) => ({ ...node, position: ensureNodePosition(node.position) }));
		const validNodeNames = validNodes.map((node) => node.name);

		validNodes.forEach((node) => {
			const nodeTypeDescription = requireNodeTypeDescription(node.type, node.typeVersion);
			const isInstalledNode = nodeTypesStore.getIsNodeInstalled(node.type);
			nodeHelpers.matchCredentials(node);
			// skip this step because nodeTypeDescription is missing for unknown nodes
			if (isInstalledNode) {
				resolveNodeParameters(node, nodeTypeDescription);
				resolveNodeWebhook(node, nodeTypeDescription);
			}
		});

		return {
			nodes: validNodes,
			connections: sanitizeConnections(data.connections, validNodeNames),
		};
	}

	return {
		requireNodeTypeDescription,
		resolveNodeParameters,
		resolveNodeWebhook,
		normalizeWorkflowData,
	};
}
