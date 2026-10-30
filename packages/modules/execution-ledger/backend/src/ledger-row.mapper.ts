import {
	EXECUTION_LEDGER_ENTITY_NAME_MAX_LENGTH,
	type ExecutionLedgerEndedFacts,
	type ExecutionLedgerStartedFacts,
} from '@n8n/db';

import type { NewExecutionLedgerRow } from './database/repositories/execution-ledger.repository';

const INT_COLUMN_MAX = 2 ** 31 - 1;

export function toStartedRow(
	facts: ExecutionLedgerStartedFacts,
	projectId: string,
	eventId: string,
): NewExecutionLedgerRow {
	return {
		...toCommonColumns(facts, projectId, eventId),
		event: 'started',
		outcome: 'none',
		blockedBy: 'none',
		runtimeMs: 0,
		timeSavedMin: 0,
	};
}

export function toEndedRow(
	facts: ExecutionLedgerEndedFacts,
	projectId: string,
	eventId: string,
): NewExecutionLedgerRow {
	return {
		...toCommonColumns(facts, projectId, eventId),
		event: 'ended',
		outcome: facts.outcome,
		blockedBy: facts.outcome === 'blocked' ? facts.blockedBy : 'none',
		runtimeMs: toIntColumn(facts.runtimeMs),
		timeSavedMin: toIntColumn(facts.timeSavedMin),
	};
}

type CommonColumns = Omit<
	NewExecutionLedgerRow,
	'event' | 'outcome' | 'blockedBy' | 'runtimeMs' | 'timeSavedMin'
>;

function toCommonColumns(
	facts: ExecutionLedgerStartedFacts,
	projectId: string,
	eventId: string,
): CommonColumns {
	return {
		executionId: facts.executionId,
		occurredAt: facts.occurredAt,
		entityType: 'workflow',
		entityName: truncateByCharacter(facts.workflowName, EXECUTION_LEDGER_ENTITY_NAME_MAX_LENGTH),
		entityId: facts.workflowId,
		projectId,
		mode: facts.mode,
		source: facts.source ?? 'none',
		origin: 'v1',
		eventId,
	};
}

/** Postgres counts characters, and `String.slice` can split a surrogate pair. */
function truncateByCharacter(value: string, maxLength: number) {
	const characters = Array.from(value);
	return characters.length <= maxLength ? value : characters.slice(0, maxLength).join('');
}

/** The columns are `int`: a run that waits for more than 24.8 days would overflow. */
function toIntColumn(value: number) {
	if (Number.isNaN(value)) return 0;
	return Math.min(Math.max(Math.round(value), 0), INT_COLUMN_MAX);
}
