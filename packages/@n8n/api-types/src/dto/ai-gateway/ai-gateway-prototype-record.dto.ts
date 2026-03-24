import { z } from 'zod';

import { Z } from '../../zod-class';

/** Prototype-only: record a model call for in-memory usage + credits demo. */
export class AiGatewayPrototypeRecordDto extends Z.class({
	resolvedModel: z.string().optional(),
	category: z.string().optional(),
	inputTokens: z.number().int().min(0).optional(),
	outputTokens: z.number().int().min(0).optional(),
	/** How many identical calls to record (e.g. one per gateway node executed). */
	calls: z.number().int().min(1).max(100).optional(),
	workflowId: z.string().optional(),
	executionId: z.string().optional(),
}) {}
