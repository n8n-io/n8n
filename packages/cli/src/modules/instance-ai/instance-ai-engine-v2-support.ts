import type { IConnections, INode, INodeTypeDescription, IWorkflowBase } from 'n8n-workflow';
import { isTriggerNodeType, UserError } from 'n8n-workflow';

import { isNodeTypeSupportedOnEngineV2 } from '@n8n/instance-ai';

/**
 * Rejects a workflow engine v2 cannot run before it is saved, so the builder
 * hears about it while it can still change the source. Two checks: node types
 * the data plane has no host services for, then the graph shape the v1-to-v2
 * converter accepts. The converter runs once per trigger, since a run starts
 * at one of them.
 */
export async function assertWorkflowRunsOnEngineV2(
	workflow: { nodes: INode[]; connections: IConnections },
	descriptions: INodeTypeDescription[],
): Promise<void> {
	const liveNodes = workflow.nodes.filter((node) => node.disabled !== true);

	const unsupported = liveNodes.filter((node) => {
		const description = descriptions.find((d) => d.name === node.type);
		return !isNodeTypeSupportedOnEngineV2(description ?? { name: node.type });
	});
	if (unsupported.length > 0) {
		const names = unsupported.map((node) => `"${node.name}" (${node.type})`).join(', ');
		throw new UserError(
			`This instance runs workflows on engine v2, which cannot run these nodes yet: ${names}. Replace them with nodes engine v2 supports.`,
		);
	}

	// Lazily imported: a top-level import would pull the v1 step executor and
	// its dependencies into every n8n process, including ones with the module off.
	const { V1WorkflowConverter } = await import('@n8n/node-engine-compatibility');
	const converter = new V1WorkflowConverter();
	// The converter reads nodes and connections only; the rest is a placeholder.
	const candidate: IWorkflowBase = {
		id: '',
		name: '',
		active: false,
		isArchived: false,
		createdAt: new Date(0),
		updatedAt: new Date(0),
		activeVersionId: null,
		nodes: workflow.nodes,
		connections: workflow.connections,
	};
	const triggers = liveNodes.filter((node) => isTriggerNodeType(node.type));
	const roots = triggers.length > 0 ? triggers.map((node) => node.name) : [undefined];
	for (const root of roots) {
		try {
			converter.convert(candidate, root);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			throw new UserError(
				`This instance runs workflows on engine v2, which cannot run this workflow yet: ${reason}`,
			);
		}
	}
}
