import type {
	AgentGoalConfig,
	AgentSlotConfig,
	GoalStatus,
	GoalToolAttachmentConfig,
} from '@n8n/api-types';
import type { IDataObject } from 'n8n-workflow';

/** The goal-graph sections of an agent config, in resolved form. */
export interface GoalGraphDefinition {
	slots: AgentSlotConfig[];
	goals: AgentGoalConfig[];
}

/**
 * Current slot values of a thread — the single source of truth from which
 * goal statuses, tool availability, and the prompt suffix are derived.
 * Values are JSON-safe (normalized via `toSlotValue`) so the state can be
 * persisted in thread metadata as-is.
 */
export type SlotValues = IDataObject;

/** Derived per evaluation, never stored. */
export type GoalStatuses = Record<string, GoalStatus>;

export interface GoalStatusChange {
	goalId: string;
	from: GoalStatus;
	to: GoalStatus;
}

/** A goal's tool attachment together with the goal it belongs to. */
export interface AttachmentRef {
	goalId: string;
	attachment: GoalToolAttachmentConfig;
}

/** Thread scope as provided on the tool context / runtime hooks. */
export interface GoalGraphPersistence {
	threadId: string;
	resourceId: string;
}

export const GOAL_SLOT_CHANGED_EVENT = 'goal-slot-changed';
export const GOAL_STATUS_CHANGED_EVENT = 'goal-status-changed';

export interface GoalSlotChangedPayload {
	slot: string;
	value: unknown;
	previous: unknown;
	/** `agent` = via the fill_slot tool; `mapping` = via a tool output mapping. */
	source: 'agent' | 'mapping';
	toolName?: string;
}

export interface GoalStatusChangedPayload {
	changes: GoalStatusChange[];
	statuses: GoalStatuses;
}
