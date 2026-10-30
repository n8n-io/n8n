import {
	EXECUTION_LEDGER_OUTCOMES,
	type ExecutionLedgerEndedFacts,
	type ExecutionLedgerStartedFacts,
} from '@n8n/db';

import { toEndedRow, toStartedRow } from '../ledger-row.mapper';

const occurredAt = new Date('2026-10-30T10:00:00.123Z');

const startedFacts: ExecutionLedgerStartedFacts = {
	executionId: 'exec-1',
	workflowId: 'wf-1',
	workflowName: 'Nightly sync',
	mode: 'trigger',
	occurredAt,
};

const endedFacts = (
	overrides: Partial<ExecutionLedgerEndedFacts> = {},
): ExecutionLedgerEndedFacts =>
	({
		...startedFacts,
		outcome: 'success',
		runtimeMs: 1500,
		timeSavedMin: 4,
		...overrides,
	}) as ExecutionLedgerEndedFacts;

describe('toStartedRow', () => {
	it('maps the facts to a started row', () => {
		expect(toStartedRow(startedFacts, 'project-1', 'event-1')).toEqual({
			executionId: 'exec-1',
			occurredAt,
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
			eventId: 'event-1',
		});
	});

	it.each(['user', 'instance_ai'] as const)('keeps the source %s', (source) => {
		expect(toStartedRow({ ...startedFacts, source }, 'project-1', 'event-1').source).toBe(source);
	});
});

describe('toEndedRow', () => {
	it('maps the facts to an ended row', () => {
		expect(toEndedRow(endedFacts(), 'project-1', 'event-1')).toMatchObject({
			event: 'ended',
			outcome: 'success',
			blockedBy: 'none',
			runtimeMs: 1500,
			timeSavedMin: 4,
			entityType: 'workflow',
			origin: 'v1',
			source: 'none',
		});
	});

	it('keeps the reason of a blocked run', () => {
		const facts = endedFacts({ outcome: 'blocked', blockedBy: 'policy' });

		expect(toEndedRow(facts, 'project-1', 'event-1')).toMatchObject({
			outcome: 'blocked',
			blockedBy: 'policy',
		});
	});

	it.each(EXECUTION_LEDGER_OUTCOMES.filter((o) => o !== 'none' && o !== 'blocked'))(
		'stores no reason for the outcome %s, even when one is given',
		(outcome) => {
			// @ts-expect-error Only a blocked run has a reason.
			const facts: ExecutionLedgerEndedFacts = { ...endedFacts(), outcome, blockedBy: 'policy' };

			expect(toEndedRow(facts, 'project-1', 'event-1').blockedBy).toBe('none');
		},
	);

	it.each([
		[1499.6, 1500],
		[-20, 0],
		[Number.NaN, 0],
		[2 ** 31, 2 ** 31 - 1],
		[Number.POSITIVE_INFINITY, 2 ** 31 - 1],
	])('stores the runtime %d as %d', (runtimeMs, expected) => {
		const row = toEndedRow(endedFacts({ runtimeMs, timeSavedMin: runtimeMs }), 'p', 'e');

		expect(row.runtimeMs).toBe(expected);
		expect(row.timeSavedMin).toBe(expected);
	});
});

describe('entity name', () => {
	const nameOf = (workflowName: string) =>
		toStartedRow({ ...startedFacts, workflowName }, 'project-1', 'event-1').entityName;

	it('keeps a name of 128 characters', () => {
		expect(nameOf('a'.repeat(128))).toBe('a'.repeat(128));
	});

	it.each([129, 200])('cuts a name of %d characters to 128', (length) => {
		expect(nameOf('a'.repeat(length))).toBe('a'.repeat(128));
	});

	it('does not split a character at the cut', () => {
		const name = `${'a'.repeat(127)}😀😀`;

		expect(nameOf(name)).toBe(`${'a'.repeat(127)}😀`);
	});
});
