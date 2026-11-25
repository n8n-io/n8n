import { parseLedgerRow, type RawLedgerRow } from '../database/ledger-row.parser';

const rawRow = (overrides: Partial<RawLedgerRow> = {}): RawLedgerRow => ({
	id: '12',
	executionId: 'exec-1',
	occurredAt: new Date('2026-10-28T10:00:00.123Z'),
	entityType: 'workflow',
	entityName: 'Nightly sync',
	entityId: 'wf-1',
	projectId: 'project-1',
	mode: 'trigger',
	source: 'none',
	event: 'ended',
	outcome: 'blocked',
	blockedBy: 'policy',
	runtimeMs: 42,
	timeSavedMin: 3,
	origin: 'v1',
	eventId: 'event-1',
	...overrides,
});

describe('parseLedgerRow', () => {
	it('parses a row as the Postgres driver returns it', () => {
		const row = parseLedgerRow(rawRow({ id: '12', runtimeMs: '42' }));

		expect(row).toEqual({
			id: '12',
			executionId: 'exec-1',
			occurredAt: new Date('2026-10-28T10:00:00.123Z'),
			entityType: 'workflow',
			entityName: 'Nightly sync',
			entityId: 'wf-1',
			projectId: 'project-1',
			mode: 'trigger',
			source: 'none',
			event: 'ended',
			outcome: 'blocked',
			blockedBy: 'policy',
			runtimeMs: 42,
			timeSavedMin: 3,
			origin: 'v1',
			eventId: 'event-1',
		});
	});

	it('parses a row as the SQLite driver returns it', () => {
		const row = parseLedgerRow(rawRow({ id: 12, occurredAt: '2026-10-28 10:00:00.123' }));

		expect(row?.id).toBe('12');
		expect(row?.occurredAt.getTime()).toBe(new Date('2026-10-28T10:00:00.123Z').getTime());
	});

	it('rejects a time that is neither a Date nor a string', () => {
		expect(parseLedgerRow(rawRow({ occurredAt: 1_761_645_600_000 }))).toBeUndefined();
	});

	it('keeps a null project', () => {
		expect(parseLedgerRow(rawRow({ projectId: null }))?.projectId).toBeNull();
	});

	it('returns undefined for a project that is neither a string nor null', () => {
		expect(parseLedgerRow(rawRow({ projectId: 42 }))).toBeUndefined();
	});

	it.each([
		['entityType', 'team'],
		['event', 'paused'],
		['outcome', 'unknown_outcome'],
		['blockedBy', 'quota'],
		['origin', 'v3'],
	] as const)('returns undefined for an unknown %s', (field, value) => {
		expect(parseLedgerRow(rawRow({ [field]: value }))).toBeUndefined();
	});

	it.each(['entityType', 'event', 'outcome', 'blockedBy', 'origin'] as const)(
		'returns undefined when %s is null',
		(field) => {
			expect(parseLedgerRow(rawRow({ [field]: null }))).toBeUndefined();
		},
	);
});
