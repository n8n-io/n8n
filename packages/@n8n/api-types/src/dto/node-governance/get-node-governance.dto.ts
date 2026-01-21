import { z } from 'zod';
import { Z } from 'zod-class';

export class GetNodeGovernanceQueryDto extends Z.class({
	projectId: z.string().min(1),
	nodeTypes: z.string().optional(), // Comma-separated list of node types
}) {}
