import type { ExecutionLedgerEndedFacts, ExecutionLedgerStartedFacts } from '@n8n/backend-services';
import { EXECUTION_LEDGER_ENTITY_NAME_MAX_LENGTH } from '@n8n/db';

import type { NewExecutionLedgerRow } from './database/repositories/execution-ledger.repository';

const INT_COLUMN_MAX = 2 ** 31 - 1;
/** Above this, a JavaScript number no longer holds every whole value. */
const BIGINT_COLUMN_MAX = Number.MAX_SAFE_INTEGER;

export function toStartedRow(
	facts: ExecutionLedgerStartedFacts,
	projectId: string,
	eventId: string,
): NewExecutionLedgerRow {
	return {
		executionId: facts.executionId,
		occurredAt: facts.occurredAt,
		entityType: 'workflow',
		entityName: truncateByCharacter(facts.workflowName, EXECUTION_LEDGER_ENTITY_NAME_MAX_LENGTH),
		entityId: facts.workflowId,
		projectId,
		mode: facts.mode,
		source: facts.source ?? 'none',
		event: 'started',
		outcome: 'none',
		blockedBy: 'none',
		runtimeMs: 0,
		timeSavedMin: 0,
		origin: 'v1',
		eventId,
	};
}

export function toEndedRow(
	facts: ExecutionLedgerEndedFacts,
	projectId: string,
	eventId: string,
): NewExecutionLedgerRow {
	const row: NewExecutionLedgerRow = {
		...toStartedRow(facts, projectId, eventId),
		event: 'ended',
		outcome: facts.outcome,
	};

	if (facts.outcome === 'blocked') return { ...row, blockedBy: facts.blockedBy };

	return {
		...row,
		runtimeMs: toWholeNumber(facts.runtimeMs, BIGINT_COLUMN_MAX),
		timeSavedMin: toWholeNumber(facts.timeSavedMin, INT_COLUMN_MAX),
	};
}

/** Postgres counts characters, and `String.slice` can split a surrogate pair. */
function truncateByCharacter(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	const characters = Array.from(value);
	return characters.length <= maxLength ? value : characters.slice(0, maxLength).join('');
}

/** Integer columns reject fractions, `NaN` and `Infinity`. A negative duration means a clock jump. */
function toWholeNumber(value: number, max: number) {
	if (Number.isNaN(value)) return 0;
	return Math.min(Math.max(Math.round(value), 0), max);
}
