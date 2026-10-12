import { isBillableExecution } from '@n8n/backend-services';
import { StatisticsNames, type UsageFact, type UsageFilter } from '@n8n/db';
import {
	ExecutionStatusList,
	isCompletedExecutionStatus,
	WorkflowExecuteModeList,
	type ExecutionStatus,
	type WorkflowExecuteMode,
	type WorkflowExecutionSource,
} from 'n8n-workflow';

/** The single definition of every usage unit, as filters over the grid's raw dimensions. */
export type UsageUnit =
	| 'root_production'
	| 'all_production'
	| 'manual'
	| 'all_runs'
	| 'agent_message';

/** The dimensions of one `usage_by_period` row. */
export type UsageDimensions = Pick<UsageFilter, 'kind'> & {
	trigger: string;
	status: string;
	/** '' for a normal run. */
	origin: string;
	isTest: boolean;
	hasParent: boolean;
};

const INSTANCE_AI: WorkflowExecutionSource = 'instance_ai';

const COMPLETED: string[] = ExecutionStatusList.filter(isCompletedExecutionStatus);

/** Derived from the billing rule, so the two cannot drift apart. */
const ROOT_TRIGGERS: string[] = WorkflowExecuteModeList.filter((mode) =>
	isBillableExecution({ mode, status: 'success' }),
);

export const USAGE_UNITS: Record<UsageUnit, UsageFilter[]> = {
	root_production: [
		{ kind: 'workflow', triggerIn: ROOT_TRIGGERS, statusIn: COMPLETED, originNotIn: [INSTANCE_AI] },
	],
	// Today's `production_*` counters: sub-workflows and error workflows included.
	all_production: [
		{
			kind: 'workflow',
			triggerNotIn: ['manual', 'chat'],
			statusIn: COMPLETED,
			originNotIn: [INSTANCE_AI],
		},
	],
	manual: [
		{ kind: 'workflow', triggerIn: ['manual'], statusIn: COMPLETED },
		{ kind: 'workflow', triggerNotIn: ['chat'], statusIn: COMPLETED, originIn: [INSTANCE_AI] },
	],
	all_runs: [{ kind: 'workflow' }],
	agent_message: [{ kind: 'agent', isTest: false, hasParent: false }],
};

/** In-memory twin of the SQL filter in `UsageRepository.sumUsage`. */
export function matchesFilter(filter: UsageFilter, row: UsageDimensions): boolean {
	return (
		row.kind === filter.kind &&
		(!filter.triggerIn || filter.triggerIn.includes(row.trigger)) &&
		(!filter.triggerNotIn || !filter.triggerNotIn.includes(row.trigger)) &&
		(!filter.statusIn || filter.statusIn.includes(row.status)) &&
		(!filter.originIn || filter.originIn.includes(row.origin)) &&
		(!filter.originNotIn || !filter.originNotIn.includes(row.origin)) &&
		(filter.isTest === undefined || filter.isTest === row.isTest) &&
		(filter.hasParent === undefined || filter.hasParent === row.hasParent)
	);
}

export function matchesUnit(unit: UsageUnit, row: UsageDimensions): boolean {
	return USAGE_UNITS[unit].some((filter) => matchesFilter(filter, row));
}

/** Statuses after which a run never changes again, so it is safe to record once. */
export function isFinalStatus(status: ExecutionStatus): boolean {
	return isCompletedExecutionStatus(status) || status === 'canceled';
}

function isWorkflowExecuteMode(value: string): value is WorkflowExecuteMode {
	return (WorkflowExecuteModeList as readonly string[]).includes(value);
}

function isExecutionStatus(value: string): value is ExecutionStatus {
	return (ExecutionStatusList as readonly string[]).includes(value);
}

function isInstanceAi(fact: UsageFact) {
	return fact.origin === INSTANCE_AI;
}

/** The legacy `workflow_statistics` counter a workflow fact adds to, or null for none. */
export function statisticsNameOf(fact: UsageFact): StatisticsNames | null {
	if (fact.kind !== 'workflow' || fact.trigger === 'chat') return null;
	if (!isExecutionStatus(fact.status) || !isCompletedExecutionStatus(fact.status)) return null;

	// Instance AI verification runs mimic the trigger's mode, but they are test runs.
	if (fact.trigger === 'manual' || isInstanceAi(fact)) {
		return fact.status === 'success' ? StatisticsNames.manualSuccess : StatisticsNames.manualError;
	}

	return fact.status === 'success'
		? StatisticsNames.productionSuccess
		: StatisticsNames.productionError;
}

/** Root-level production, as billing counts it. Feeds the legacy `rootCount`. */
export function isRootFact(fact: UsageFact): boolean {
	if (fact.kind !== 'workflow') return false;
	if (!isWorkflowExecuteMode(fact.trigger) || !isExecutionStatus(fact.status)) return false;
	return isBillableExecution(
		{ mode: fact.trigger, status: fact.status },
		isInstanceAi(fact) ? INSTANCE_AI : undefined,
	);
}
