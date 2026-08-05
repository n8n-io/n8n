import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { computed, type ComputedRef, type Ref } from 'vue';
import { isExpression } from '@/app/utils/expressions';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { isHttpRequestNodeType } from '@/features/setupPanel/setupPanel.utils';
import { isResourceLocatorValue, NodeHelpers, type INodeParameters } from 'n8n-workflow';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { buildSectionId } from '../workflowSetup.helpers';
import { AI_GATEWAY_MANAGED_TAG } from '../../constants';

export function useWorkflowSetupSections(
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]> | ComputedRef<InstanceAiWorkflowSetupNode[]>,
): { sections: ComputedRef<WorkflowSetupSection[]> } {
	const nodeTypesStore = useNodeTypesStore();

	const sections = computed<WorkflowSetupSection[]>(() => {
		const result: WorkflowSetupSection[] = [];
		const primaryByGroupKey = new Map<string, WorkflowSetupSection>();

		for (const req of setupRequests.value) {
			const parameterNames = (req.editableParameters ?? []).map((parameter) => parameter.name);
			if (!req.credentialType && parameterNames.length === 0) continue;

			const credentialType = req.credentialType;
			const hasParams = parameterNames.length > 0;
			const groupKey = buildGroupKey(req, credentialType);
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
				parameters: dropStaleResourceLocatorCache(
					resolveParameterDefaults(req.node),
					parameterNames,
				),
			};
			const existingCred = credentialType ? req.node.credentials?.[credentialType] : undefined;
			const currentCredentialId =
				credentialType === undefined
					? null
					: existingCred !== undefined && '__aiGatewayManaged' in existingCred
						? AI_GATEWAY_MANAGED_TAG
						: (existingCred?.id ?? null);

			const section: WorkflowSetupSection = {
				id: buildSectionId(req.node.name, credentialType),
				...(credentialType ? { credentialType } : {}),
				targetNodeName: req.node.name,
				node,
				currentCredentialId,
				parameterNames,
				credentialTargetNodes: [{ id: req.node.id, name: req.node.name, type: req.node.type }],
			};

			result.push(section);
			if (groupKey && !existingPrimary) primaryByGroupKey.set(groupKey, section);
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

	return { sections };
}

/**
 * A resource locator with a cached display name but no value renders as if a
 * resource were selected, while its "required" issue keeps the section
 * incomplete — the user can't tell why they can't continue. Drop the stale
 * cache so the field honestly shows as unset.
 */
function dropStaleResourceLocatorCache(
	parameters: INodeParameters,
	parameterNames: string[],
): INodeParameters {
	let result = parameters;
	for (const name of parameterNames) {
		const parameter = result[name];
		if (!isResourceLocatorValue(parameter)) continue;
		const isEmpty =
			parameter.value === '' || parameter.value === null || parameter.value === undefined;
		if (!isEmpty) continue;
		if (parameter.cachedResultName === undefined && parameter.cachedResultUrl === undefined) {
			continue;
		}
		const { cachedResultName, cachedResultUrl, ...rest } = parameter;
		result = { ...result, [name]: rest };
	}
	return result;
}

/**
 * Build a merge key for credential-only sections.
 *
 * When the request is a sub-node (has `subnodeRootNode`), the root node's name is
 * prepended so credential sections never merge across different root nodes —
 * sub-nodes of two different agents stay separate even when they share a
 * credential type. Standalone nodes (no subnode root) keep the original
 * credentialType+URL merging behaviour to preserve the existing UX
 * optimisation of configuring a shared credential once.
 */
function buildGroupKey(
	req: InstanceAiWorkflowSetupNode,
	credentialType: string | undefined,
): string | null {
	if (!credentialType) return null;

	const rootPrefix = req.subnodeRootNode?.name ? `${req.subnodeRootNode.name}|` : '';
	const baseKey = `${rootPrefix}${credentialType}`;

	if (!isHttpRequestNodeType(req.node.type)) return baseKey;

	const url = req.node.parameters?.url;
	if (typeof url !== 'string') return `${baseKey}|http|none`;
	if (isExpression(url)) return `${baseKey}|http|expr|${req.node.name}`;
	return `${baseKey}|http|${url}`;
}
