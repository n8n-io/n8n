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

/** Returns `undefined` for a row with a value that this version does not know. */
export function parseLedgerRow(raw: RawLedgerRow): ExecutionLedgerRow | undefined {
	const { entityType, event, outcome, blockedBy, origin, occurredAt } = raw;
	if (
		!isOneOf(EXECUTION_LEDGER_ENTITY_TYPES, entityType) ||
		!isOneOf(EXECUTION_LEDGER_EVENTS, event) ||
		!isOneOf(EXECUTION_LEDGER_OUTCOMES, outcome) ||
		!isOneOf(EXECUTION_LEDGER_BLOCKED_BY, blockedBy) ||
		!isOneOf(EXECUTION_LEDGER_ORIGINS, origin) ||
		!(occurredAt instanceof Date || typeof occurredAt === 'string')
	) {
		return undefined;
	}

	return {
		id: String(raw.id),
		executionId: String(raw.executionId),
		occurredAt: parseDbTime(occurredAt),
		entityType,
		entityName: String(raw.entityName),
		entityId: String(raw.entityId),
		projectId: String(raw.projectId),
		mode: String(raw.mode),
		source: String(raw.source),
		event,
		outcome,
		blockedBy,
		runtimeMs: Number(raw.runtimeMs),
		timeSavedMin: Number(raw.timeSavedMin),
		origin,
		eventId: String(raw.eventId),
	};
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
	return values.some((allowed) => allowed === value);
}
