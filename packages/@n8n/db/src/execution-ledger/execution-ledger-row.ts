export const EXECUTION_LEDGER_ENTITY_TYPES = ['workflow', 'agent'] as const;
export const EXECUTION_LEDGER_EVENTS = ['started', 'ended'] as const;
export const EXECUTION_LEDGER_OUTCOMES = [
	'none',
	'success',
	'error',
	'crashed',
	'canceled',
	'blocked',
] as const;
export const EXECUTION_LEDGER_BLOCKED_BY = [
	'none',
	'policy',
	'credentialAccess',
	'invalidWorkflow',
	'contextHook',
	'startFailed',
] as const;
export const EXECUTION_LEDGER_ORIGINS = ['v1', 'v2'] as const;

export type ExecutionLedgerEntityType = (typeof EXECUTION_LEDGER_ENTITY_TYPES)[number];
export type ExecutionLedgerEvent = (typeof EXECUTION_LEDGER_EVENTS)[number];
export type ExecutionLedgerOutcome = (typeof EXECUTION_LEDGER_OUTCOMES)[number];
export type ExecutionLedgerBlockedBy = (typeof EXECUTION_LEDGER_BLOCKED_BY)[number];
export type ExecutionLedgerOrigin = (typeof EXECUTION_LEDGER_ORIGINS)[number];

/** One claimed `execution_ledger` row, as fold steps receive it. */
export type ExecutionLedgerRow = Readonly<{
	/** A string, because the Postgres `bigint` does not fit a number. */
	id: string;
	executionId: string;
	occurredAt: Date;
	entityType: ExecutionLedgerEntityType;
	entityName: string;
	entityId: string;
	projectId: string;
	/** Not constrained in the table: engine v2 rows can carry other values. */
	mode: string;
	source: string;
	event: ExecutionLedgerEvent;
	outcome: ExecutionLedgerOutcome;
	blockedBy: ExecutionLedgerBlockedBy;
	runtimeMs: number;
	timeSavedMin: number;
	origin: ExecutionLedgerOrigin;
	eventId: string;
}>;

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
	return values.some((allowed) => allowed === value);
}
