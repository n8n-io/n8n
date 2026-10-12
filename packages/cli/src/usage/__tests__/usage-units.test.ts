import { isBillableExecution } from '@n8n/backend-services';
import { StatisticsNames, type UsageFact, type UsageFilter } from '@n8n/db';
import {
	ExecutionStatusList,
	WorkflowExecuteModeList,
	type ExecutionStatus,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	isFinalStatus,
	isRootFact,
	matchesFilter,
	matchesUnit,
	statisticsNameOf,
	type UsageDimensions,
	type UsageUnit,
} from '../usage-units';

function makeUsageFact(overrides: Partial<UsageFact> = {}): UsageFact {
	return {
		kind: 'workflow',
		executionId: 'exec-1',
		phase: 'finished',
		subjectId: 'workflow-1',
		subjectName: 'Test workflow',
		projectId: 'project-1',
		trigger: 'webhook',
		status: 'success',
		origin: null,
		isTest: false,
		parentId: null,
		startedAt: new Date('2026-10-12T10:00:00.000Z'),
		occurredAt: new Date('2026-10-12T10:00:01.000Z'),
		...overrides,
	};
}

function makeDims(overrides: Partial<UsageDimensions> = {}): UsageDimensions {
	return {
		kind: 'workflow',
		trigger: 'webhook',
		status: 'success',
		origin: '',
		isTest: false,
		hasParent: false,
		...overrides,
	};
}

const ORIGINS = ['', 'user', 'instance_ai'] as const;

type Mismatch = {
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
	origin: string;
	hasParent: boolean;
	assertion: string;
	expected: unknown;
	actual: unknown;
};

describe('matchesUnit equivalence with isBillableExecution, isRootFact and statisticsNameOf', () => {
	it('agrees for every mode x status x origin x hasParent combination', () => {
		const mismatches: Mismatch[] = [];

		for (const mode of WorkflowExecuteModeList) {
			for (const status of ExecutionStatusList) {
				for (const origin of ORIGINS) {
					for (const hasParent of [false, true]) {
						const dims = makeDims({ trigger: mode, status, origin, hasParent });
						const fact = makeUsageFact({
							trigger: mode,
							status,
							origin: origin === '' ? null : origin,
							parentId: hasParent ? 'parent-exec-1' : null,
						});

						const rootViaFilter = matchesUnit('root_production', dims);
						const rootViaBilling = isBillableExecution(
							{ mode, status },
							origin === 'instance_ai' ? 'instance_ai' : undefined,
						);
						const rootViaFact = isRootFact(fact);

						if (rootViaFilter !== rootViaBilling) {
							mismatches.push({
								mode,
								status,
								origin,
								hasParent,
								assertion: 'root_production vs isBillableExecution',
								expected: rootViaBilling,
								actual: rootViaFilter,
							});
						}
						if (rootViaFilter !== rootViaFact) {
							mismatches.push({
								mode,
								status,
								origin,
								hasParent,
								assertion: 'root_production vs isRootFact',
								expected: rootViaFact,
								actual: rootViaFilter,
							});
						}

						const name = statisticsNameOf(fact);

						const expectedAllProduction =
							name === StatisticsNames.productionSuccess ||
							name === StatisticsNames.productionError;
						const actualAllProduction = matchesUnit('all_production', dims);
						if (actualAllProduction !== expectedAllProduction) {
							mismatches.push({
								mode,
								status,
								origin,
								hasParent,
								assertion: 'all_production vs statisticsNameOf',
								expected: expectedAllProduction,
								actual: actualAllProduction,
							});
						}

						const expectedManual =
							name === StatisticsNames.manualSuccess || name === StatisticsNames.manualError;
						const actualManual = matchesUnit('manual', dims);
						if (actualManual !== expectedManual) {
							mismatches.push({
								mode,
								status,
								origin,
								hasParent,
								assertion: 'manual vs statisticsNameOf',
								expected: expectedManual,
								actual: actualManual,
							});
						}

						const actualAllRuns = matchesUnit('all_runs', dims);
						if (!actualAllRuns) {
							mismatches.push({
								mode,
								status,
								origin,
								hasParent,
								assertion: 'all_runs should always match a workflow row',
								expected: true,
								actual: actualAllRuns,
							});
						}
					}
				}
			}
		}

		expect(mismatches).toEqual([]);
	});
});

describe('matchesUnit agent_message', () => {
	it('matches a non-test, top-level agent row', () => {
		expect(matchesUnit('agent_message', makeDims({ kind: 'agent' }))).toBe(true);
	});

	it('does not match a test agent row', () => {
		expect(matchesUnit('agent_message', makeDims({ kind: 'agent', isTest: true }))).toBe(false);
	});

	it('does not match an agent row with a parent', () => {
		expect(matchesUnit('agent_message', makeDims({ kind: 'agent', hasParent: true }))).toBe(false);
	});

	it('never matches a workflow-kind row', () => {
		expect(matchesUnit('agent_message', makeDims({ kind: 'workflow' }))).toBe(false);
	});

	test.each<Exclude<UsageUnit, 'agent_message'>>([
		'root_production',
		'all_production',
		'manual',
		'all_runs',
	])('agent-kind rows never match the workflow unit %s', (unit) => {
		expect(matchesUnit(unit, makeDims({ kind: 'agent' }))).toBe(false);
	});
});

describe('matchesFilter', () => {
	const base: UsageFilter = { kind: 'workflow' };

	it('filters by triggerIn', () => {
		const filter: UsageFilter = { ...base, triggerIn: ['webhook', 'cli'] };
		expect(matchesFilter(filter, makeDims({ trigger: 'webhook' }))).toBe(true);
		expect(matchesFilter(filter, makeDims({ trigger: 'manual' }))).toBe(false);
	});

	it('filters by triggerNotIn', () => {
		const filter: UsageFilter = { ...base, triggerNotIn: ['chat'] };
		expect(matchesFilter(filter, makeDims({ trigger: 'chat' }))).toBe(false);
		expect(matchesFilter(filter, makeDims({ trigger: 'webhook' }))).toBe(true);
	});

	it('filters by statusIn', () => {
		const filter: UsageFilter = { ...base, statusIn: ['success', 'error'] };
		expect(matchesFilter(filter, makeDims({ status: 'success' }))).toBe(true);
		expect(matchesFilter(filter, makeDims({ status: 'waiting' }))).toBe(false);
	});

	it('filters by originIn', () => {
		const filter: UsageFilter = { ...base, originIn: ['instance_ai'] };
		expect(matchesFilter(filter, makeDims({ origin: 'instance_ai' }))).toBe(true);
		expect(matchesFilter(filter, makeDims({ origin: '' }))).toBe(false);
	});

	it('filters by originNotIn', () => {
		const filter: UsageFilter = { ...base, originNotIn: ['instance_ai'] };
		expect(matchesFilter(filter, makeDims({ origin: 'instance_ai' }))).toBe(false);
		expect(matchesFilter(filter, makeDims({ origin: '' }))).toBe(true);
	});

	it('filters by isTest', () => {
		const filter: UsageFilter = { ...base, isTest: true };
		expect(matchesFilter(filter, makeDims({ isTest: true }))).toBe(true);
		expect(matchesFilter(filter, makeDims({ isTest: false }))).toBe(false);
	});

	it('filters by hasParent', () => {
		const filter: UsageFilter = { ...base, hasParent: true };
		expect(matchesFilter(filter, makeDims({ hasParent: true }))).toBe(true);
		expect(matchesFilter(filter, makeDims({ hasParent: false }))).toBe(false);
	});

	it('rejects a row of a different kind regardless of other fields', () => {
		expect(matchesFilter(base, makeDims({ kind: 'agent' }))).toBe(false);
	});
});

describe('isFinalStatus', () => {
	test.each<ExecutionStatus>(['success', 'error', 'crashed', 'canceled'])(
		'returns true for terminal status %s',
		(status) => {
			expect(isFinalStatus(status)).toBe(true);
		},
	);

	test.each<ExecutionStatus>(['waiting', 'running', 'new', 'unknown'])(
		'returns false for non-terminal status %s',
		(status) => {
			expect(isFinalStatus(status)).toBe(false);
		},
	);
});

describe('statisticsNameOf', () => {
	it('returns null for an agent-kind fact', () => {
		const fact = makeUsageFact({ kind: 'agent', trigger: 'chat_message' });
		expect(statisticsNameOf(fact)).toBeNull();
	});

	it('returns null for chat mode', () => {
		expect(statisticsNameOf(makeUsageFact({ trigger: 'chat' }))).toBeNull();
	});

	test.each<ExecutionStatus>(['waiting', 'canceled', 'running', 'new', 'unknown'])(
		'returns null for non-completed status %s',
		(status) => {
			expect(statisticsNameOf(makeUsageFact({ status }))).toBeNull();
		},
	);

	it('returns manual_success for a manual trigger on success', () => {
		expect(statisticsNameOf(makeUsageFact({ trigger: 'manual', status: 'success' }))).toBe(
			StatisticsNames.manualSuccess,
		);
	});

	it('returns manual_error for a manual trigger on error', () => {
		expect(statisticsNameOf(makeUsageFact({ trigger: 'manual', status: 'error' }))).toBe(
			StatisticsNames.manualError,
		);
	});

	it('returns a manual_* name for an instance_ai origin even in webhook mode', () => {
		expect(
			statisticsNameOf(
				makeUsageFact({ trigger: 'webhook', status: 'success', origin: 'instance_ai' }),
			),
		).toBe(StatisticsNames.manualSuccess);
		expect(
			statisticsNameOf(
				makeUsageFact({ trigger: 'webhook', status: 'error', origin: 'instance_ai' }),
			),
		).toBe(StatisticsNames.manualError);
	});

	test.each<WorkflowExecuteMode>(['integrated', 'error'])(
		'returns a production_* name for non-root mode %s',
		(mode) => {
			expect(statisticsNameOf(makeUsageFact({ trigger: mode, status: 'success' }))).toBe(
				StatisticsNames.productionSuccess,
			);
			expect(statisticsNameOf(makeUsageFact({ trigger: mode, status: 'error' }))).toBe(
				StatisticsNames.productionError,
			);
		},
	);

	it('returns production_error for a crashed run', () => {
		expect(statisticsNameOf(makeUsageFact({ trigger: 'webhook', status: 'crashed' }))).toBe(
			StatisticsNames.productionError,
		);
	});
});
