import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { computed, type ComputedRef, type Ref } from 'vue';
import { HTTP_REQUEST_NODE_TYPE, HTTP_REQUEST_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { isExpression } from '@/app/utils/expressions';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { NodeHelpers, type INodeParameters } from 'n8n-workflow';
import type { WorkflowSetupCard } from '../workflowSetup.types';

const isHttpRequestNodeType = (type: string) =>
	type === HTTP_REQUEST_NODE_TYPE || type === HTTP_REQUEST_TOOL_NODE_TYPE;

export function useWorkflowSetupCards(
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]> | ComputedRef<InstanceAiWorkflowSetupNode[]>,
): { cards: ComputedRef<WorkflowSetupCard[]> } {
	const nodeTypesStore = useNodeTypesStore();

	const cards = computed<WorkflowSetupCard[]>(() => {
		const result: WorkflowSetupCard[] = [];
		const primaryByGroupKey = new Map<string, WorkflowSetupCard>();

		for (const req of setupRequests.value) {
			const parameterNames = (req.editableParameters ?? []).map((parameter) => parameter.name);
			if (!req.credentialType && parameterNames.length === 0) continue;

			const credentialType = req.credentialType;
			const hasParams = parameterNames.length > 0;
			const groupKey = buildGroupKey(req.node, credentialType);
			const existingPrimary = groupKey ? primaryByGroupKey.get(groupKey) : undefined;

			if (existingPrimary && !hasParams) {
				existingPrimary.credentialTargetNodes.push({
					id: req.node.id,
					name: req.node.name,
					type: req.node.type,
				});
				continue;
			}

			const node = {
				...req.node,
				parameters: resolveParameterDefaults(req.node),
			};
			const currentCredentialId =
				credentialType === undefined ? null : (req.node.credentials?.[credentialType]?.id ?? null);

			const card: WorkflowSetupCard = {
				id: `${req.node.name}:${credentialType ?? 'parameters'}`,
				...(credentialType ? { credentialType } : {}),
				targetNodeName: req.node.name,
				node,
				currentCredentialId,
				parameterNames,
				credentialTargetNodes: [{ id: req.node.id, name: req.node.name, type: req.node.type }],
			};

			result.push(card);
			if (groupKey && !existingPrimary) primaryByGroupKey.set(groupKey, card);
		}

		return result;
	});

	function resolveParameterDefaults(node: InstanceAiWorkflowSetupNode['node']): INodeParameters {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) return node.parameters as INodeParameters;

		return (NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.parameters as INodeParameters,
			true,
			true,
			node,
			nodeType,
		) ?? node.parameters) as INodeParameters;
	}

	return { cards };
}

function buildGroupKey(
	node: InstanceAiWorkflowSetupNode['node'],
	credentialType: string | undefined,
): string | null {
	if (!credentialType) return null;
	if (!isHttpRequestNodeType(node.type)) return credentialType;

	const url = node.parameters?.url;
	if (typeof url !== 'string') return `${credentialType}|http|none`;
	if (isExpression(url)) return `${credentialType}|http|expr|${node.name}`;
	return `${credentialType}|http|${url}`;
}
