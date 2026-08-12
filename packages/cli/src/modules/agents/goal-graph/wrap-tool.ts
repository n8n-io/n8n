import type { BuiltTool } from '@n8n/agents';
import { isSuspendedToolResult, isZodSchema } from '@n8n/agents';
import type { JSONSchema7 } from 'json-schema';

import { applySlotWrites, type SlotWrite } from './apply-slot-writes';
import { deriveGoalStatuses } from './derive-status';
import { evaluateGoalExpression, isTruthy, toJsonContext } from './expressions';
import type { GoalGraphStateService } from './goal-graph-state.service';
import type { AttachmentRef, GoalGraphDefinition, SlotValues } from './types';

export interface WrapGoalToolOptions {
	tool: BuiltTool;
	/** All goal attachments referencing this tool (usually one). */
	attachments: AttachmentRef[];
	definition: GoalGraphDefinition;
	agentId: string;
	stateService: GoalGraphStateService;
}

/**
 * Wrap a goal-attached tool with deterministic wiring:
 *
 * - **Bindings**: bound parameters are removed from the LLM-visible input
 *   schema and injected from `$state` at execution time — the model cannot
 *   supply or override them.
 * - **Gate**: defensive lock check at execution time (the primary gate is the
 *   runtime `toolsFilter`, which hides the tool entirely while locked).
 * - **Output mappings**: tool results are written back into slots, statuses
 *   re-derived, and change events emitted.
 *
 * Approval wrapping (`wrapToolForApproval`) stays inside: a suspended result
 * passes through untouched; mappings apply on the post-resume execution.
 */
export function wrapGoalTool(options: WrapGoalToolOptions): BuiltTool {
	const { tool, attachments, definition, agentId, stateService } = options;

	const boundParams = new Set<string>(
		attachments.flatMap((ref) => Object.keys(ref.attachment.bindings ?? {})),
	);

	return {
		...tool,
		inputSchema: stripBoundParams(tool.inputSchema, boundParams),
		handler: async (input, ctx) => {
			const persistence = ctx.persistence;
			const state = stateService.getState(agentId, persistence?.threadId, definition);

			const active = findActiveAttachment(attachments, definition, state);
			if (!active) {
				// Defensive only — toolsFilter removes locked tools from the LLM's
				// view. Reachable on resume paths, which bypass the filter.
				return {
					locked: true,
					message: `Tool "${tool.name}" is locked by the goal graph — its goal is not active. Check the goal overview for what must be achieved first.`,
				};
			}

			const injected: Record<string, unknown> =
				typeof input === 'object' && input !== null && !Array.isArray(input)
					? { ...(input as Record<string, unknown>) }
					: {};
			const missingBindings: string[] = [];
			for (const [param, expression] of Object.entries(active.attachment.bindings ?? {})) {
				const value = evaluateGoalExpression(expression, { state });
				if (value !== null && value !== undefined) {
					// State holds the canonical value — it overrides whatever the model
					// passed (the core guarantee: the model can't forge a bound input).
					// Slot values keep their declared slot type, which may differ from the
					// tool's input type (e.g. a string id feeding a number input) — bridge
					// the boundary with a lossless coercion when the schema demands it.
					injected[param] = coerceBoundValue(tool.inputSchema, param, value);
				} else if (injected[param] === null || injected[param] === undefined) {
					// Neither state nor the model supplied it — genuinely missing.
					missingBindings.push(param);
				}
				// Else: state is empty but the model supplied the value this step (e.g. a
				// standard slot whose sibling fill_slot call in the same step hasn't
				// landed yet). Keep the model's value so the call still succeeds — the
				// gate already blocks tools whose prerequisite slots are unset.
			}

			if (missingBindings.length > 0) {
				// A bound input has no value from state and none from the model. Return a
				// clear result instead of passing `undefined` into the tool, which would
				// fail its own input validation opaquely.
				return {
					ok: false,
					missingInputs: missingBindings,
					message: `Cannot run "${tool.name}" yet — required input(s) not set: ${missingBindings.join(', ')}. Set the state slot(s) that populate them first (via fill_slot for a standard slot, or by completing the goal whose tool writes them).`,
				};
			}

			if (!tool.handler) {
				throw new Error(`No handler found for tool "${tool.name}"`);
			}
			const result = await tool.handler(injected, ctx);
			if (isSuspendedToolResult(result)) return result;

			const mappings = Object.entries(active.attachment.outputMappings ?? {});
			if (mappings.length > 0) {
				const json = toJsonContext(result);
				const currentState = stateService.getState(agentId, persistence?.threadId, definition);
				const writes: SlotWrite[] = mappings.map(([slot, expression]) => ({
					slot,
					value: evaluateGoalExpression(expression, { state: currentState, json }),
					source: 'mapping',
					toolName: tool.name,
				}));
				applySlotWrites({
					agentId,
					persistence,
					definition,
					stateService,
					writes,
					emitEvent: ctx.emitEvent,
				});
			}

			return result;
		},
	};
}

/**
 * Find the first attachment whose goal is Active and whose `availableWhen`
 * (when present) holds. Returns `undefined` when the tool is locked.
 */
export function findActiveAttachment(
	attachments: AttachmentRef[],
	definition: GoalGraphDefinition,
	state: SlotValues,
): AttachmentRef | undefined {
	const statuses = deriveGoalStatuses(definition.goals, state);
	return attachments.find(
		(ref) =>
			statuses[ref.goalId] === 'active' &&
			(!ref.attachment.availableWhen ||
				isTruthy(evaluateGoalExpression(ref.attachment.availableWhen, { state }))),
	);
}

/**
 * Lossless coercion candidates for a value that missed the expected primitive
 * type — expression-derived slot values often arrive as strings (everything
 * round-trips through JSON) while tool inputs declare numbers/booleans.
 */
function coercionCandidates(value: unknown): unknown[] {
	if (typeof value === 'string') {
		const candidates: unknown[] = [];
		const trimmed = value.trim();
		if (trimmed !== '' && Number.isFinite(Number(trimmed))) candidates.push(Number(trimmed));
		if (trimmed === 'true' || trimmed === 'false') candidates.push(trimmed === 'true');
		return candidates;
	}
	if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
	return [];
}

/**
 * Fit an injected binding value to the tool's declared input type for `param`,
 * coercing only when the coerced value actually validates. The original value
 * is returned untouched when it already fits, when the schema cannot be
 * introspected, or when no lossless coercion satisfies it (the tool's own
 * validation then reports the mismatch).
 */
function coerceBoundValue(
	inputSchema: BuiltTool['inputSchema'],
	param: string,
	value: unknown,
): unknown {
	if (!inputSchema) return value;

	// Zod object schema (workflow tools) — probe the field validator directly.
	if (isZodSchema(inputSchema)) {
		const shape = (inputSchema as { shape?: Record<string, unknown> }).shape;
		const field = shape?.[param] as
			| { safeParse?: (v: unknown) => { success: boolean } }
			| undefined;
		if (!field?.safeParse) return value;
		if (field.safeParse(value).success) return value;
		for (const candidate of coercionCandidates(value)) {
			if (field.safeParse(candidate).success) return candidate;
		}
		return value;
	}

	// JSON Schema (custom tools) — match the declared primitive type.
	const property = inputSchema.properties?.[param];
	if (!property || typeof property !== 'object') return value;
	const expected = property.type;
	const actual = typeof value;
	if (
		(expected === 'number' && actual === 'number') ||
		(expected === 'integer' && actual === 'number') ||
		(expected === 'string' && actual === 'string') ||
		(expected === 'boolean' && actual === 'boolean')
	) {
		return value;
	}
	for (const candidate of coercionCandidates(value)) {
		const candidateType = typeof candidate;
		if (
			((expected === 'number' || expected === 'integer') && candidateType === 'number') ||
			(expected === 'string' && candidateType === 'string') ||
			(expected === 'boolean' && candidateType === 'boolean')
		) {
			if (expected === 'integer' && !Number.isInteger(candidate)) continue;
			return candidate;
		}
	}
	return value;
}

/**
 * Remove bound parameters from the LLM-visible input schema. Only JSON-Schema
 * inputs are rewritten (custom tools persist their schema as JSON Schema);
 * Zod schemas pass through unchanged — injection still overrides any
 * model-supplied value, so the guarantee degrades gracefully from "invisible"
 * to "overridden".
 */
function stripBoundParams(
	inputSchema: BuiltTool['inputSchema'],
	boundParams: Set<string>,
): BuiltTool['inputSchema'] {
	if (!inputSchema || boundParams.size === 0) return inputSchema;
	if (isZodSchema(inputSchema)) return inputSchema;

	const schema = inputSchema;
	const properties = { ...(schema.properties ?? {}) };
	for (const param of boundParams) {
		delete properties[param];
	}
	const required = (schema.required ?? []).filter((name) => !boundParams.has(name));
	const stripped: JSONSchema7 = { ...schema, properties };
	if (schema.required !== undefined) stripped.required = required;
	return stripped;
}
