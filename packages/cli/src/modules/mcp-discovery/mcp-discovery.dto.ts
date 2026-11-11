// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class McpDiscoveryVisitRequestDto extends Z.class({
	pickedClaude: z.boolean().optional(),
	isTrial: z.boolean().optional(),
}) {}
// EOF Experiment cleanup
