import type { ExecutionLedgerRow } from '@n8n/db';
import { randomUUID } from 'node:crypto';

let nextId = 1;

export const ledgerRow = (overrides: Partial<ExecutionLedgerRow> = {}): ExecutionLedgerRow => ({
	id: String(nextId++),
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
	// The ledger rejects a blocked row that has no reason.
	blockedBy: overrides.outcome === 'blocked' ? 'startFailed' : 'none',
	runtimeMs: 0,
	timeSavedMin: 0,
	origin: 'v1',
	eventId: randomUUID(),
	...overrides,
});
