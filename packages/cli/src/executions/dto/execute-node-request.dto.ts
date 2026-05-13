import { Z } from '@n8n/api-types';
import { z } from 'zod';

/**
 * Request body schema for `POST /executions/node`.
 *
 * Wraps a single-node execution request as accepted by `ExecuteNodeService`.
 * Used by n8n Hub callers (MCP server, SDK, CLI, Instance AI) to run a single node
 * directly via the HTTP API without authoring a full workflow.
 */
export class ExecuteNodeRequestDto extends Z.class({
	nodeType: z.string().min(1),
	nodeVersion: z.number().optional(),
	parameters: z.record(z.unknown()).default({}),
	credentialId: z.string().optional(),
	dryRun: z.boolean().optional(),
	caller: z
		.object({
			kind: z.enum(['mcp', 'sdk', 'cli', 'instance-ai']),
			name: z.string(),
			clientId: z.string().optional(),
		})
		.optional(),
}) {}
