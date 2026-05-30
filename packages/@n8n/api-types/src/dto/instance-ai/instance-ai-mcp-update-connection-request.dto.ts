import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Settings payload for an MCP connection. Accepted by the PATCH endpoint
 * today but not persisted — the entity has no settings columns yet. Persistence
 * lands in a follow-up; the request shape is forward-compatible so the FE can
 * already submit changes.
 */
export class InstanceAiMcpUpdateConnectionRequestDto extends Z.class({
	inclusionMode: z.enum(['all', 'selected', 'except']).optional(),
	selectedTools: z.array(z.string()).optional(),
	excludedTools: z.array(z.string()).optional(),
}) {}
