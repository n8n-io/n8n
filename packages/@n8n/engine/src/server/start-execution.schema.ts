import { z } from 'zod';

import { jsonValueSchema } from '../common';
import { MAX_SLOT_INDEX } from '../graph';

export const MAX_TRIGGER_SLOTS = MAX_SLOT_INDEX + 1;

const stepTypeSchema = z.enum(['trigger', 'v1-node', 'wait', 'subworkflow', 'batch']);

// Non-empty: lifecycle events reship both as identifiers.
const graphNodeSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: stepTypeSchema,
	config: z.unknown().optional(),
});

const graphEdgeSchema = z.object({
	from: z.string(),
	to: z.string(),
	// Defaulted rather than optional so callers can omit the common 0/0 case while
	// the engine always sees a fully-populated edge.
	outputIndex: z.number().int().nonnegative().default(0),
	inputIndex: z.number().int().nonnegative().default(0),
	isBackEdge: z.boolean().optional(),
});

/** The graph a start request carries. Exported so a host can validate one it relays. */
export const workflowGraphSchema = z.object({
	nodes: z.array(graphNodeSchema),
	edges: z.array(graphEdgeSchema),
});

/** Trigger output slots. Empty means "no payload": send `null` or omit instead. */
export const triggerOutputsSchema = z.array(jsonValueSchema).min(1).max(MAX_TRIGGER_SLOTS);
