import { type User } from '@n8n/db';
import type { INodeTypeDescription } from 'n8n-workflow';
import type z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema } from './schemas';

import { isTriggerNodeType, getNodeConnections } from '@n8n/ai-workflow-builder';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	workflowJson: workflowJsonSchema.describe('The workflow JSON to validate'),
} satisfies z.ZodRawShape;

/**
 * Validate workflow structure: check for triggers, orphaned nodes, missing connections.
 */
function validateWorkflow(
	nodes: typeof workflowJsonSchema._type.nodes,
	connections: typeof workflowJsonSchema._type.connections,
	nodeTypes: INodeTypeDescription[],
): string[] {
	const issues: string[] = [];

	if (nodes.length === 0) {
		issues.push('Workflow has no nodes');
		return issues;
	}

	// Check for trigger
	const triggers = nodes.filter((n) => isTriggerNodeType(n.type));
	if (triggers.length === 0) {
		issues.push('Workflow has no trigger node. A trigger is required to start the workflow.');
	}

	// Check for unknown node types
	for (const node of nodes) {
		const nodeType = nodeTypes.find((nt) => nt.name === node.type);
		if (!nodeType) {
			issues.push(`Node "${node.name}" has unknown type "${node.type}"`);
		}
	}

	// Check for orphaned nodes (no connections at all, excluding triggers)
	for (const node of nodes) {
		if (isTriggerNodeType(node.type)) continue;

		const outgoing = getNodeConnections(connections, node.name, 'source');
		const incoming = getNodeConnections(connections, node.name, 'target');

		if (outgoing.length === 0 && incoming.length === 0) {
			issues.push(`Node "${node.name}" is orphaned (no incoming or outgoing connections)`);
		}
	}

	// Check for duplicate node names
	const nameCount = new Map<string, number>();
	for (const node of nodes) {
		nameCount.set(node.name, (nameCount.get(node.name) ?? 0) + 1);
	}
	for (const [name, count] of nameCount) {
		if (count > 1) {
			issues.push(`Duplicate node name "${name}" (appears ${count} times)`);
		}
	}

	// Check for connections referencing non-existent nodes
	const nodeNames = new Set(nodes.map((n) => n.name));
	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		if (!nodeNames.has(sourceName)) {
			issues.push(`Connection references non-existent source node "${sourceName}"`);
			continue;
		}
		for (const typeConns of Object.values(sourceConns)) {
			for (const outputConns of typeConns) {
				if (outputConns) {
					for (const conn of outputConns) {
						if (!nodeNames.has(conn.node)) {
							issues.push(
								`Connection from "${sourceName}" references non-existent target node "${conn.node}"`,
							);
						}
					}
				}
			}
		}
	}

	return issues;
}

export const createValidateWorkflowTool = (
	user: User,
	nodeTypes: INodeTypeDescription[],
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'validate_workflow',
	config: {
		description:
			'Validate a workflow structure. Checks for missing triggers, orphaned nodes, duplicate names, and broken connections.',
		inputSchema,
		annotations: {
			title: 'Validate Workflow',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowJson }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'validate_workflow',
			parameters: { nodeCount: workflowJson.nodes.length },
		};

		try {
			const issues = validateWorkflow(workflowJson.nodes, workflowJson.connections, nodeTypes);

			const payload = {
				valid: issues.length === 0,
				issues,
				nodeCount: workflowJson.nodes.length,
			};

			telemetryPayload.results = {
				success: true,
				data: {
					valid: payload.valid,
					issue_count: issues.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
