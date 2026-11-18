import { randomUUID } from 'node:crypto';

import type { NewExecutionLedgerRow } from '../database/repositories/execution-ledger.repository';

export const ledgerRow = (
	overrides: Partial<NewExecutionLedgerRow> = {},
): NewExecutionLedgerRow => ({
	executionId: randomUUID(),
	occurredAt: new Date('2026-10-28T10:00:00.123Z'),
	entityType: 'workflow',
	entityName: 'Nightly sync',
	entityId: 'wf-1',
	projectId: 'project-1',
	mode: 'trigger',
	source: 'none',
	event: 'started',
	outcome: 'none',
	blockedBy: 'none',
	runtimeMs: 0,
	timeSavedMin: 0,
	origin: 'v1',
	eventId: randomUUID(),
	...overrides,
});
