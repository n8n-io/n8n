/**
 * Workflow-context tool — read-only.
 *
 * Exposes the workflow the user has open in the editor (and the currently
 * selected node, if any) to the agent. NEVER mutates anything: there is no
 * service call here, and the workflow-chat mode strips write tools from the
 * agent's tool surface.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, WorkflowSnapshotNode } from '../types';

export const WORKFLOW_CONTEXT_TOOL_ID = 'workflow-context';

const describeAction = z.object({
	action: z
		.literal('describe-current-workflow')
		.describe(
			'Return the open workflow as JSON: id, name, nodes, connections, and the list of trigger node names. Read-only — does not modify the workflow.',
		),
});

const currentNodeAction = z.object({
	action: z
		.literal('get-current-node')
		.describe(
			'Return the node currently focused in the Node Details View (NDV), or null if no NDV is open. Read-only.',
		),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [describeAction, currentNodeAction]),
);

type Input = z.infer<typeof describeAction> | z.infer<typeof currentNodeAction>;

const TRIGGER_TYPE_RE = /(^|\.)([a-zA-Z0-9]+)Trigger$/;

function listTriggerNodes(nodes: readonly WorkflowSnapshotNode[]): string[] {
	return nodes.filter((n) => TRIGGER_TYPE_RE.test(n.type)).map((n) => n.name);
}

export function createWorkflowContextTool(context: InstanceAiContext) {
	return createTool({
		id: WORKFLOW_CONTEXT_TOOL_ID,
		description:
			'Read-only access to the workflow the user currently has open in the editor. Use this to answer questions about triggers, node wiring, credentials, and what each node does. This tool cannot modify the workflow.',
		inputSchema,
		// eslint-disable-next-line @typescript-eslint/require-await
		execute: async (input: Input) => {
			const snapshot = context.currentWorkflowSnapshot;
			if (!snapshot) return { error: 'no-open-workflow' as const };

			switch (input.action) {
				case 'describe-current-workflow':
					return {
						workflowId: snapshot.workflowId,
						name: snapshot.name,
						nodes: snapshot.nodes,
						connections: snapshot.connections,
						triggerNodes: listTriggerNodes(snapshot.nodes),
						activeNodeName: snapshot.activeNodeName ?? null,
					};
				case 'get-current-node': {
					const name = snapshot.activeNodeName;
					if (!name) return { node: null };
					const node = snapshot.nodes.find((n) => n.name === name) ?? null;
					return { node };
				}
			}
		},
	});
}
