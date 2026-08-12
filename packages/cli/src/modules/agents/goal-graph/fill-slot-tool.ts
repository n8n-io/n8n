import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

import { applySlotWrites } from './apply-slot-writes';
import type { GoalGraphStateService } from './goal-graph-state.service';
import type { GoalGraphDefinition } from './types';

export const FILL_SLOT_TOOL_NAME = 'fill_slot';

const SLOT_TYPE_VALIDATORS = {
	string: z.string(),
	number: z.number(),
	boolean: z.boolean(),
	object: z.union([z.record(z.unknown()), z.array(z.unknown())]),
} as const;

/**
 * Built-in tool letting the agent record information learned in conversation
 * (e.g. the email a customer states) into `standard` slots. `protected` and
 * `private` slots are not offered — they can only be written by declared tool
 * output mappings, so the agent cannot self-certify past a gate.
 *
 * Returns `undefined` when the definition declares no `standard` slots.
 */
export function createFillSlotTool(options: {
	agentId: string;
	definition: GoalGraphDefinition;
	stateService: GoalGraphStateService;
}): BuiltTool | undefined {
	const { agentId, definition, stateService } = options;

	const agentSlots = definition.slots.filter((slot) => slot.access === 'standard');
	if (agentSlots.length === 0) return undefined;

	const slotsByName = new Map(agentSlots.map((slot) => [slot.name, slot]));
	const slotNames = agentSlots.map((slot) => slot.name);
	const inputSchema = z.object({
		slot: z.enum([slotNames[0], ...slotNames.slice(1)]).describe('Name of the state slot to fill'),
		value: z
			.union([z.string(), z.number(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())])
			.describe('Value for the slot; must match the slot type'),
	});

	return {
		name: FILL_SLOT_TOOL_NAME,
		description:
			'Record a piece of information from the conversation into a goal-graph state slot. ' +
			'Available slots: ' +
			agentSlots
				.map(
					(slot) => `${slot.name} (${slot.type}${slot.description ? `: ${slot.description}` : ''})`,
				)
				.join(', '),
		systemInstruction:
			'Use fill_slot as soon as the user provides information matching an unfilled state slot — goal progress is computed from slots, not from the conversation text.',
		inputSchema,
		// eslint-disable-next-line @typescript-eslint/require-await -- BuiltTool handlers must return a Promise; slot writes are synchronous (persistence is fire-and-forget).
		handler: async (input, ctx) => {
			const { slot: slotName, value } = inputSchema.parse(input);
			const slot = slotsByName.get(slotName);
			if (!slot) {
				return { ok: false, message: `Unknown or non-fillable slot "${slotName}".` };
			}

			const validator = SLOT_TYPE_VALIDATORS[slot.type];
			const validated = validator.safeParse(value);
			if (!validated.success) {
				return {
					ok: false,
					message: `Value for slot "${slotName}" must be of type ${slot.type}.`,
				};
			}

			const { statuses, changes } = applySlotWrites({
				agentId,
				persistence: ctx.persistence,
				definition,
				stateService,
				writes: [{ slot: slotName, value: validated.data, source: 'agent' }],
				emitEvent: ctx.emitEvent,
			});

			return { ok: true, slot: slotName, value: validated.data, goalStatuses: statuses, changes };
		},
	};
}
