import { z } from 'zod';
import { Z } from 'zod-class';

// For GET requests (legacy, not recommended due to URL length limits)
export class GetNodeGovernanceQueryDto extends Z.class({
	projectId: z.string().min(1),
	nodeTypes: z.string().optional(), // Comma-separated list of node types
}) {}

// For POST requests (preferred to avoid URL length limits)
export class GetNodeGovernanceBodyDto extends Z.class({
	projectId: z.string().min(1),
	nodeTypes: z.array(z.string()).default([]),
}) {}
