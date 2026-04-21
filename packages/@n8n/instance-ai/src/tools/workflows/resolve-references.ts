import type { InstanceAiWorkflowReferences } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

export async function resolveReferences(
	context: InstanceAiContext,
	workflowId: string,
	options?: { excludeNodeNames?: Set<string>; nodes?: WorkflowJSON['nodes'] },
): Promise<InstanceAiWorkflowReferences | undefined> {
	if (!context.getWorkflowReferences) return undefined;
	try {
		const references = await context.getWorkflowReferences(workflowId);
		const exclude = options?.excludeNodeNames;
		const nodes = options?.nodes;
		if (!exclude || exclude.size === 0 || !nodes) return references;

		const validCredIds = new Set<string>();
		for (const node of nodes) {
			if (node.name && exclude.has(node.name)) continue;
			for (const cred of Object.values(node.credentials ?? {})) {
				if (cred?.id) validCredIds.add(cred.id);
			}
		}
		return {
			...references,
			appliedCredentials: references.appliedCredentials.filter((c) => validCredIds.has(c.id)),
		};
	} catch (error) {
		context.logger?.warn?.('getWorkflowReferences failed', { error });
		return undefined;
	}
}
