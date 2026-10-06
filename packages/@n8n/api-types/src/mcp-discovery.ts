import { z } from 'zod';

import { Z } from './zod-class';

export const MCP_DISCOVERY_EXPERIMENT_KEY = '123_surface_mcp_to_claude_trial_users';

export const mcpDiscoveryAssignmentSchema = z.object({
	variant: z.enum(['control', 'variant']),
	assignedAt: z.number().finite(),
});

export const mcpDiscoveryStateSchema = z.object({
	status: z.enum(['inactive', 'unknown', 'waiting', 'excluded', 'assigned']),
	eligibleAt: z.number().finite().optional(),
	assignment: mcpDiscoveryAssignmentSchema.optional(),
	coachmarkDismissed: z.boolean(),
	hasConnectedClaude: z.boolean().optional(),
	hasUsedClaudeMcp: z.boolean().optional(),
});

export type McpDiscoveryState = z.infer<typeof mcpDiscoveryStateSchema>;

export class McpDiscoveryVisitRequestDto extends Z.class({
	pickedClaude: z.boolean().optional(),
}) {}
