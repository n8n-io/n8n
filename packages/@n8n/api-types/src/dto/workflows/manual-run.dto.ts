import type { AiAgentRequest, IDestinationNode, IRunData, ITaskData } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

// The engine validates deeper states
const isObject = (val: unknown): boolean => typeof val === 'object' && val !== null;

const destinationNodeSchema = z.object({
	nodeName: z.string(),
	mode: z.enum(['inclusive', 'exclusive']),
}) satisfies z.ZodType<IDestinationNode>;

const triggerToStartFromSchema = z.object({
	name: z.string(),
	data: z.custom<ITaskData>(isObject).optional(),
});

const agentRequestSchema = z.custom<AiAgentRequest>(isObject);

// The endpoint serves three distinct use cases, discriminated by which keys
// are present, with the same precedence `executeManually` narrows with.
// Parsing with the matching schema strips keys that belong to the other cases
// (e.g. `runData` sent alongside a trigger), so they cannot leak into the
// wrong execution path.

// 1. Full manual execution from a known trigger
const fullManualExecutionFromKnownTriggerSchema = z.object({
	agentRequest: agentRequestSchema.optional(),
	chatSessionId: z.string().optional(),
	destinationNode: destinationNodeSchema.optional(),
	triggerToStartFrom: triggerToStartFromSchema,
});

// 2. Full manual execution from an unknown trigger, derived from the destination
const fullManualExecutionFromUnknownTriggerSchema = z.object({
	agentRequest: agentRequestSchema.optional(),
	destinationNode: destinationNodeSchema,
});

// 3. Partial execution up to a destination node, reusing existing run data
const partialManualExecutionToDestinationSchema = z.object({
	agentRequest: agentRequestSchema.optional(),
	runData: z.custom<IRunData>(isObject),
	destinationNode: destinationNodeSchema,
	dirtyNodeNames: z.array(z.string()).optional(),
});

export type FullManualExecutionFromKnownTriggerPayload = z.infer<
	typeof fullManualExecutionFromKnownTriggerSchema
>;
export type FullManualExecutionFromUnknownTriggerPayload = z.infer<
	typeof fullManualExecutionFromUnknownTriggerSchema
>;
export type PartialManualExecutionToDestinationPayload = z.infer<
	typeof partialManualExecutionToDestinationSchema
>;

export type ManualRunPayload =
	| FullManualExecutionFromKnownTriggerPayload
	| FullManualExecutionFromUnknownTriggerPayload
	| PartialManualExecutionToDestinationPayload;

// Payloads with neither a trigger nor a destination fit none of the cases.
const missingStartConditionSchema = z.custom<never>(() => false, {
	message:
		'To run the workflow manually, specify either a trigger to start from or a destination node.',
});

function schemaFor(data: unknown) {
	// Not an object: any case schema reports the type error
	if (!isObject(data)) return fullManualExecutionFromKnownTriggerSchema;

	const payload = data as Record<string, unknown>;
	if (payload.triggerToStartFrom !== undefined) return fullManualExecutionFromKnownTriggerSchema;
	if (payload.destinationNode === undefined) return missingStartConditionSchema;
	return payload.runData !== undefined
		? partialManualExecutionToDestinationSchema
		: fullManualExecutionFromUnknownTriggerSchema;
}

/**
 * The all-fields shape below only defines the class contract; validation
 * always goes through the per-case schemas via `parse`/`safeParse`. The
 * inherited constructor and `.extend()` bypass the case discrimination —
 * don't use them.
 */
export class ManualRunDto extends Z.class({
	agentRequest: agentRequestSchema.optional(),
	chatSessionId: z.string().optional(),
	destinationNode: destinationNodeSchema.optional(),
	triggerToStartFrom: triggerToStartFromSchema.optional(),
	runData: z.custom<IRunData>(isObject).optional(),
	dirtyNodeNames: z.array(z.string()).optional(),
}) {
	static safeParse(data: unknown): z.SafeParseReturnType<unknown, ManualRunPayload> {
		return schemaFor(data).safeParse(data);
	}

	static parse(data: unknown): ManualRunPayload {
		return schemaFor(data).parse(data);
	}
}
