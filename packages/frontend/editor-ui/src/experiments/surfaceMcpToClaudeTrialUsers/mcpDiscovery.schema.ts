import { z } from 'zod';

export const mcpDiscoveryStateSchema = z.object({
	status: z.enum(['inactive', 'unknown', 'waiting', 'excluded', 'assigned']),
	eligibleAt: z.number().finite().optional(),
	hasConnectedClaude: z.boolean().optional(),
	hasUsedMcp: z.boolean().optional(),
});

export type McpDiscoveryState = z.infer<typeof mcpDiscoveryStateSchema>;
