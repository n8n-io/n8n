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
			for (const [param, expression] of Object.entries(active.attachment.bindings ?? {})) {
				injected[param] = evaluateGoalExpression(expression, { state });
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
