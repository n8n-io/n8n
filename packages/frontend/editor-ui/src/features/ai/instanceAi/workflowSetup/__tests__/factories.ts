import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type { WorkflowSetupCard } from '../workflowSetup.types';

export function makeSetupRequest(
	overrides: Omit<Partial<InstanceAiWorkflowSetupNode>, 'node'> & {
		node?: Partial<InstanceAiWorkflowSetupNode['node']>;
	} = {},
): InstanceAiWorkflowSetupNode {
	const { node: nodeOverrides, ...requestOverrides } = overrides;
	const node: InstanceAiWorkflowSetupNode['node'] = {
		id: 'http-request',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [0, 0],
		parameters: {},
	};

	return {
		credentialType: 'httpBasicAuth',
		existingCredentials: [],
		isTrigger: false,
		...requestOverrides,
		node: {
			...node,
			...nodeOverrides,
		},
	};
}

export function makeWorkflowSetupCard(
	overrides: Omit<Partial<WorkflowSetupCard>, 'node'> & {
		node?: Partial<WorkflowSetupCard['node']>;
	} = {},
): WorkflowSetupCard {
	const node: WorkflowSetupCard['node'] = {
		id: 'http-request',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [0, 0],
		parameters: {},
	};

	const credentialType = 'credentialType' in overrides ? overrides.credentialType : 'httpBasicAuth';
	const targetNodeName = overrides.targetNodeName ?? overrides.node?.name ?? node.name;
	const finalNode = {
		...node,
		name: targetNodeName,
		...overrides.node,
	};

	return {
		id: overrides.id ?? `${targetNodeName}:${credentialType ?? 'parameters'}`,
		...(credentialType ? { credentialType } : {}),
		targetNodeName,
		node: finalNode,
		currentCredentialId: overrides.currentCredentialId ?? null,
		parameterNames: overrides.parameterNames ?? [],
		credentialTargetNodes: overrides.credentialTargetNodes ?? [
			{ id: finalNode.id, name: finalNode.name, type: finalNode.type },
		],
	};
}
