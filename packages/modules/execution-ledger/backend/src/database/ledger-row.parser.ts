import {
	EXECUTION_LEDGER_BLOCKED_BY,
	EXECUTION_LEDGER_ENTITY_TYPES,
	EXECUTION_LEDGER_EVENTS,
	EXECUTION_LEDGER_ORIGINS,
	EXECUTION_LEDGER_OUTCOMES,
	type ExecutionLedgerRow,
	parseDbTime,
} from '@n8n/db';

/** A ledger row as the driver returns it, before its values are checked. */
export type RawLedgerRow = Record<keyof ExecutionLedgerRow, unknown>;

/** Normalises the driver types of a raw row. It does not check the enum-like values. */
export function coerceLedgerRow(raw: RawLedgerRow) {
	return {
		id: String(raw.id),
		executionId: String(raw.executionId),
		occurredAt: toDate(raw.occurredAt),
		entityType: String(raw.entityType),
		entityName: String(raw.entityName),
		entityId: String(raw.entityId),
		projectId: typeof raw.projectId === 'string' ? raw.projectId : null,
		mode: String(raw.mode),
		source: String(raw.source),
		event: String(raw.event),
		outcome: String(raw.outcome),
		blockedBy: String(raw.blockedBy),
		runtimeMs: Number(raw.runtimeMs),
		timeSavedMin: Number(raw.timeSavedMin),
		origin: String(raw.origin),
		eventId: String(raw.eventId),
	};
}

/** Returns `undefined` for a row with a value that this version does not know. */
export function parseLedgerRow(raw: RawLedgerRow): ExecutionLedgerRow | undefined {
	const { entityType, event, outcome, blockedBy, origin, projectId } = raw;
	if (
		!isOneOf(EXECUTION_LEDGER_ENTITY_TYPES, entityType) ||
		!isOneOf(EXECUTION_LEDGER_EVENTS, event) ||
		!isOneOf(EXECUTION_LEDGER_OUTCOMES, outcome) ||
		!isOneOf(EXECUTION_LEDGER_BLOCKED_BY, blockedBy) ||
		!isOneOf(EXECUTION_LEDGER_ORIGINS, origin) ||
		!isDbTime(raw.occurredAt) ||
		!(typeof projectId === 'string' || projectId === null)
	) {
		return undefined;
	}

	return { ...coerceLedgerRow(raw), entityType, event, outcome, blockedBy, origin, projectId };
}

function isDbTime(value: unknown): value is Date | string {
	return value instanceof Date || typeof value === 'string';
}

// A time that no driver returns becomes the epoch: a throw here would block the fold.
function toDate(value: unknown): Date {
	return isDbTime(value) ? parseDbTime(value) : new Date(0);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
	return values.some((allowed) => allowed === value);
}
