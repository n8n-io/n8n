import type { AgentEventData } from '@n8n/agents';
import { AgentEvent } from '@n8n/agents';

import { deriveGoalStatuses, diffGoalStatuses } from './derive-status';
import { coerceToSlotType } from './expressions';
import type { GoalGraphStateService } from './goal-graph-state.service';
import type {
	GoalGraphDefinition,
	GoalGraphPersistence,
	GoalSlotChangedPayload,
	GoalStatusChangedPayload,
	GoalStatusChange,
	GoalStatuses,
	SlotValues,
} from './types';
import { GOAL_SLOT_CHANGED_EVENT, GOAL_STATUS_CHANGED_EVENT } from './types';

export interface SlotWrite {
	slot: string;
	value: unknown;
	source: GoalSlotChangedPayload['source'];
	toolName?: string;
}

export interface ApplySlotWritesResult {
	state: SlotValues;
	statuses: GoalStatuses;
	changes: GoalStatusChange[];
}

/**
 * Apply slot writes, re-derive goal statuses, and emit `goal-slot-changed` /
 * `goal-status-changed` events through the runtime event bus (surfaced to the
 * chat stream and the persisted timeline as `custom-event` chunks).
 */
export function applySlotWrites(options: {
	agentId: string;
	persistence: GoalGraphPersistence | undefined;
	definition: GoalGraphDefinition;
	stateService: GoalGraphStateService;
	writes: SlotWrite[];
	emitEvent?: (event: AgentEventData) => void;
}): ApplySlotWritesResult {
	const { agentId, persistence, definition, stateService, writes, emitEvent } = options;
	const threadId = persistence?.threadId;

	const before = deriveGoalStatuses(
		definition.goals,
		stateService.getState(agentId, threadId, definition),
	);

	const slotsByName = new Map(definition.slots.map((slot) => [slot.name, slot]));
	for (const write of writes) {
		// Align the written value with the slot's declared type — goal conditions
		// compare strictly, so e.g. a numeric code arriving as a number must be
		// stored as the string the slot declares.
		const declared = slotsByName.get(write.slot);
		const value = declared ? coerceToSlotType(declared, write.value) : write.value;
		const { previous } = stateService.setSlot(agentId, persistence, definition, write.slot, value);
		const payload: GoalSlotChangedPayload = {
			slot: write.slot,
			value,
			previous,
			source: write.source,
			toolName: write.toolName,
		};
		emitEvent?.({ type: AgentEvent.Custom, name: GOAL_SLOT_CHANGED_EVENT, payload });
	}

	const state = stateService.getState(agentId, threadId, definition);
	const statuses = deriveGoalStatuses(definition.goals, state);
	const changes = diffGoalStatuses(before, statuses);
	if (changes.length > 0) {
		const payload: GoalStatusChangedPayload = { changes, statuses };
		emitEvent?.({ type: AgentEvent.Custom, name: GOAL_STATUS_CHANGED_EVENT, payload });
	}

	return { state, statuses, changes };
}
