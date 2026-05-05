import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { computed, type ComputedRef, type Ref } from 'vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { NodeHelpers, type INodeParameters } from 'n8n-workflow';
import type { WorkflowSetupCard } from '../workflowSetup.types';

export function useWorkflowSetupCards(
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]> | ComputedRef<InstanceAiWorkflowSetupNode[]>,
): { cards: ComputedRef<WorkflowSetupCard[]> } {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();

	const cards = computed<WorkflowSetupCard[]>(() => {
		const result: WorkflowSetupCard[] = [];

		for (const req of setupRequests.value) {
			const parameterNames = (req.editableParameters ?? []).map((parameter) => parameter.name);
			if (!req.credentialType && parameterNames.length === 0) continue;

			const credentialType = req.credentialType;
			const node = {
				...req.node,
				parameters: resolveParameterDefaults(req.node),
			};
			const currentCredentialId =
				credentialType === undefined
					? null
					: (req.node.credentials?.[credentialType]?.id ??
						credentialsStore.allCredentials.find((credential) => credential.type === credentialType)
							?.id ??
						null);

			result.push({
				id: `${req.node.name}:${credentialType ?? 'parameters'}`,
				...(credentialType ? { credentialType } : {}),
				targetNodeName: req.node.name,
				node,
				currentCredentialId,
				parameterNames,
			});
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
