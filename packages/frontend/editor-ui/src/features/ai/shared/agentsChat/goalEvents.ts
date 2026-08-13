import { isRecord } from '@n8n/utils/is-record';

// ---------------------------------------------------------------------------
// Goal-graph event chips (experimental `goal-graph` agents module)
// ---------------------------------------------------------------------------

/** A small status chip rendered in the chat when goal-graph state changes. */
export interface GoalEventChip {
	id: string;
	label: string;
	theme: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary';
}

const GOAL_STATUS_THEMES: Record<string, GoalEventChip['theme']> = {
	achieved: 'success',
	failed: 'danger',
	active: 'primary',
	locked: 'default',
};

function formatChipValue(value: unknown): string {
	const rendered = JSON.stringify(value) ?? 'null';
	return rendered.length > 40 ? `${rendered.slice(0, 37)}…` : rendered;
}

/**
 * Map a `custom-event` SSE payload (goal-graph events emitted by the backend)
 * to display chips. Labels are data-only (slot/goal ids and statuses), so no
 * i18n is involved. Unknown event names yield no chips.
 */
export function goalEventToChips(name: string, payload: unknown): GoalEventChip[] {
	if (!isRecord(payload)) return [];

	if (name === 'goal-status-changed' && Array.isArray(payload.changes)) {
		return payload.changes.filter(isRecord).map((change) => ({
			id: crypto.randomUUID(),
			label: `${String(change.goalId)}: ${String(change.from)} → ${String(change.to)}`,
			theme: GOAL_STATUS_THEMES[String(change.to)] ?? 'default',
		}));
	}

	if (name === 'goal-slot-changed' && typeof payload.slot === 'string') {
		return [
			{
				id: crypto.randomUUID(),
				label: `${payload.slot} = ${formatChipValue(payload.value)}`,
				theme: 'secondary',
			},
		];
	}

	return [];
}
