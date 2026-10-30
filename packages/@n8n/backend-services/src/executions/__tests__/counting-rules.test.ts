import {
	ExecutionStatusList,
	isCompletedExecutionStatus,
	WorkflowExecuteModeList,
	type ExecutionStatus,
	type WorkflowExecuteMode,
	type WorkflowExecutionSource,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	countsTowardExecutionLimit,
	executionLimitDelta,
	isBillableExecution,
	isInsightsProduction,
	isLedgerFact,
	savesTime,
	toLedgerOutcome,
} from '../counting-rules';
import type {
	CompletedRun,
	LedgerEntityType,
	LedgerEvent,
	LedgerFact,
	LedgerOutcome,
	LedgerSource,
} from '../counting-rules';

const allModes: WorkflowExecuteMode[] = [...WorkflowExecuteModeList];
const allStatuses: ExecutionStatus[] = [...ExecutionStatusList];

// Exhaustive lists: a new outcome, source, event or entity type breaks the `satisfies`.

const allOutcomes = Object.keys({
	none: true,
	success: true,
	error: true,
	crashed: true,
	canceled: true,
	blocked: true,
} satisfies Record<LedgerOutcome, true>) as LedgerOutcome[];

const allSources = Object.keys({
	none: true,
	user: true,
	instance_ai: true,
} satisfies Record<LedgerSource, true>) as LedgerSource[];

const allEvents = Object.keys({
	started: true,
	ended: true,
} satisfies Record<LedgerEvent, true>) as LedgerEvent[];

const allEntityTypes = Object.keys({
	workflow: true,
	agent: true,
} satisfies Record<LedgerEntityType, true>) as LedgerEntityType[];

const allFacts: LedgerFact[] = allEntityTypes.flatMap((entityType) =>
	allModes.flatMap((mode) =>
		allSources.flatMap((source) =>
			allEvents.flatMap((event) =>
				allOutcomes.map((outcome) => ({ entityType, mode, source, event, outcome })),
			),
		),
	),
);

function describeFact(fact: LedgerFact) {
	return `${fact.entityType}/${fact.mode}/${fact.source}/${fact.event}/${fact.outcome}`;
}

function findMismatches(
	actual: (fact: LedgerFact) => unknown,
	expected: (fact: LedgerFact) => unknown,
) {
	return allFacts
		.filter((fact) => actual(fact) !== expected(fact))
		.map((fact) => `${describeFact(fact)}: expected ${String(expected(fact))}`);
}

// Hand-written expectations: explicit value lists, independent of the source maps.
const expectBillable = (f: LedgerFact) =>
	f.entityType === 'workflow' &&
	f.event === 'ended' &&
	['success', 'error', 'crashed'].includes(f.outcome) &&
	f.source !== 'instance_ai' &&
	['cli', 'retry', 'trigger', 'webhook', 'evaluation'].includes(f.mode);

const expectInsights = (f: LedgerFact) =>
	f.entityType === 'workflow' &&
	f.event === 'ended' &&
	['success', 'error', 'crashed', 'blocked'].includes(f.outcome) &&
	f.source !== 'instance_ai' &&
	['cli', 'retry', 'trigger', 'webhook', 'evaluation', 'error'].includes(f.mode);

const expectSavesTime = (f: LedgerFact) =>
	f.entityType === 'workflow' &&
	f.event === 'ended' &&
	f.outcome === 'success' &&
	f.source !== 'instance_ai' &&
	['cli', 'retry', 'trigger', 'webhook', 'evaluation'].includes(f.mode);

const expectLimit = (f: LedgerFact) =>
	f.event === 'started' &&
	f.outcome === 'none' &&
	f.source !== 'instance_ai' &&
	['cli', 'retry', 'trigger', 'webhook', 'evaluation', 'internal', 'agent'].includes(f.mode);

const expectDelta = (f: LedgerFact) => {
	if (expectLimit(f)) return 1;
	const wouldHaveCounted = expectLimit({ ...f, event: 'started', outcome: 'none' });
	return f.event === 'ended' && f.outcome === 'blocked' && wouldHaveCounted ? -1 : 0;
};

function fact(overrides: Partial<LedgerFact> = {}): LedgerFact {
	return {
		entityType: 'workflow',
		mode: 'webhook',
		source: 'none',
		event: 'ended',
		outcome: 'success',
		...overrides,
	};
}

function run(mode: WorkflowExecuteMode, status: ExecutionStatus): CompletedRun {
	return { mode, status, startedAt: new Date(), data: { resultData: {} } };
}

describe('isBillableExecution (fact)', () => {
	test('matches the expected rule for every fact', () => {
		expect(findMismatches(isBillableExecution, expectBillable)).toEqual([]);
	});

	test('a blocked run is not billable', () => {
		expect(isBillableExecution(fact({ outcome: 'blocked' }))).toBe(false);
	});
});

describe('isInsightsProduction (fact)', () => {
	test('matches the expected rule for every fact', () => {
		expect(findMismatches(isInsightsProduction, expectInsights)).toEqual([]);
	});

	test('a blocked run counts in Insights', () => {
		expect(isInsightsProduction(fact({ outcome: 'blocked' }))).toBe(true);
	});
});

describe('savesTime', () => {
	test('matches the expected rule for every fact', () => {
		expect(findMismatches(savesTime, expectSavesTime)).toEqual([]);
	});

	test('an error workflow saves no time even on success', () => {
		expect(savesTime(fact({ mode: 'error' }))).toBe(false);
	});
});

describe('countsTowardExecutionLimit', () => {
	test('matches the expected rule for every fact', () => {
		expect(findMismatches(countsTowardExecutionLimit, expectLimit)).toEqual([]);
	});

	test.each<LedgerEvent>(['started', 'ended'])(
		'a blocked run never counts toward the limit (event %s)',
		(event) => {
			expect(countsTowardExecutionLimit(fact({ event, outcome: 'blocked' }))).toBe(false);
		},
	);

	test('a sub-workflow start does not count toward the limit', () => {
		const start = fact({ mode: 'integrated', event: 'started', outcome: 'none' });
		expect(countsTowardExecutionLimit(start)).toBe(false);
	});
});

describe('executionLimitDelta', () => {
	test('matches the expected delta for every fact', () => {
		expect(findMismatches(executionLimitDelta, expectDelta)).toEqual([]);
	});

	test('is +1 for a counted start', () => {
		expect(executionLimitDelta(fact({ event: 'started', outcome: 'none' }))).toBe(1);
	});

	test('is -1 when a counted run ends blocked', () => {
		expect(executionLimitDelta(fact({ event: 'ended', outcome: 'blocked' }))).toBe(-1);
	});

	test('is 0 when a run ends normally', () => {
		expect(executionLimitDelta(fact({ event: 'ended', outcome: 'success' }))).toBe(0);
	});

	test('is 0 when a sub-workflow run ends blocked', () => {
		const end = fact({ mode: 'integrated', event: 'ended', outcome: 'blocked' });
		expect(executionLimitDelta(end)).toBe(0);
	});
});

describe('rules with an inherited key as a value', () => {
	const rules = {
		isBillableExecution,
		isInsightsProduction,
		savesTime,
		countsTowardExecutionLimit,
	};
	const counted = { billable: fact(), limit: fact({ event: 'started', outcome: 'none' }) };

	test.each(['constructor', 'toString', '__proto__'])('count nowhere for %s', (value) => {
		for (const [name, rule] of Object.entries(rules)) {
			const base = name === 'countsTowardExecutionLimit' ? counted.limit : counted.billable;
			for (const column of Object.keys(base)) {
				expect(rule({ ...base, [column]: value } as LedgerFact)).toBe(false);
			}
		}
	});
});

describe('isLedgerFact', () => {
	test('returns true for a valid row', () => {
		expect(isLedgerFact(fact())).toBe(true);
	});

	test.each([
		{ column: 'entityType', value: 'bogus' },
		{ column: 'mode', value: 'bogus' },
		{ column: 'source', value: 'bogus' },
		{ column: 'event', value: 'bogus' },
		{ column: 'outcome', value: 'finished' },
	])('returns false when $column is $value', ({ column, value }) => {
		expect(isLedgerFact({ ...fact(), [column]: value })).toBe(false);
	});

	test.each(['toString', '__proto__', 'constructor', 'hasOwnProperty'])(
		'returns false for the prototype key %s as a value',
		(value) => {
			for (const column of Object.keys(fact())) {
				expect(isLedgerFact({ ...fact(), [column]: value })).toBe(false);
			}
		},
	);
});

describe('toLedgerOutcome', () => {
	const startedAt = new Date();

	test.each<[ExecutionStatus, LedgerOutcome]>([
		['success', 'success'],
		['error', 'error'],
		['crashed', 'crashed'],
		['canceled', 'canceled'],
		['new', 'none'],
		['running', 'none'],
		['unknown', 'none'],
		['waiting', 'none'],
	])('maps status %s to outcome %s', (status, expected) => {
		expect(toLedgerOutcome({ mode: 'webhook', status, startedAt })).toBe(expected);
	});

	test('returns blocked for an error that failed before start', () => {
		const data = { resultData: { failedBeforeStart: true as const } };
		expect(toLedgerOutcome({ mode: 'webhook', status: 'error', startedAt, data })).toBe('blocked');
	});

	test('returns blocked for a crash that no runner took', () => {
		expect(toLedgerOutcome({ mode: 'webhook', status: 'crashed', startedAt: null })).toBe(
			'blocked',
		);
	});

	test('keeps canceled when no runner took the run', () => {
		expect(toLedgerOutcome({ mode: 'webhook', status: 'canceled', startedAt: null })).toBe(
			'canceled',
		);
	});

	test('keeps success when the run carries failedBeforeStart', () => {
		const data = { resultData: { failedBeforeStart: true as const } };
		expect(toLedgerOutcome({ mode: 'webhook', status: 'success', startedAt, data })).toBe(
			'success',
		);
	});
});

describe('isBillableExecution (run)', () => {
	test('returns false for a production run that failed before its first node started', () => {
		expect(
			isBillableExecution({
				...run('webhook', 'error'),
				data: { resultData: { failedBeforeStart: true } },
			}),
		).toBe(false);
	});

	test('returns false for a production run that no runner took', () => {
		expect(isBillableExecution({ mode: 'trigger', status: 'crashed', startedAt: null })).toBe(
			false,
		);
	});

	test('returns true for a crashed production run that a runner took', () => {
		expect(isBillableExecution({ mode: 'trigger', status: 'crashed', startedAt: new Date() })).toBe(
			true,
		);
	});

	test('does not treat a deep mock as a ledger fact', () => {
		expect(isBillableExecution(mock<CompletedRun>())).toBe(false);
	});
});

describe('run form equivalence with the previous per-service rules', () => {
	const sources: Array<WorkflowExecutionSource | undefined> = [undefined, 'user', 'instance_ai'];

	const skipMode: Record<WorkflowExecuteMode, boolean> = {
		cli: false,
		error: false,
		retry: false,
		trigger: false,
		webhook: false,
		evaluation: false,
		integrated: true,
		internal: true,
		manual: true,
		chat: true,
		agent: true,
	};

	const billableMode: Record<WorkflowExecuteMode, boolean> = {
		cli: true,
		retry: true,
		trigger: true,
		webhook: true,
		evaluation: true,
		integrated: false,
		error: false,
		internal: false,
		manual: false,
		chat: false,
		agent: false,
	};

	const cases = allModes.flatMap((mode) =>
		allStatuses.flatMap((status) => sources.map((source) => ({ mode, status, source }))),
	);
	type RunCase = (typeof cases)[number];

	const findRunMismatches = (
		actual: (run: CompletedRun, source?: WorkflowExecutionSource) => boolean,
		previous: (c: RunCase) => boolean,
	) =>
		cases
			.filter((c) => actual(run(c.mode, c.status), c.source) !== previous(c))
			.map(({ mode, status, source }) => `${mode}/${status}/${String(source)}`);

	test('isInsightsProduction matches the previous Insights rule for every run', () => {
		const previous = ({ mode, status, source }: RunCase) =>
			isCompletedExecutionStatus(status) && !skipMode[mode] && source !== 'instance_ai';
		expect(findRunMismatches(isInsightsProduction, previous)).toEqual([]);
	});

	test('isBillableExecution matches the previous billable rule for every run', () => {
		const previous = ({ mode, status, source }: RunCase) =>
			source !== 'instance_ai' && billableMode[mode] && isCompletedExecutionStatus(status);
		expect(findRunMismatches(isBillableExecution, previous)).toEqual([]);
	});
});
