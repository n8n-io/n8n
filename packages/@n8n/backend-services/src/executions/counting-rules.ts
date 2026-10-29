import {
	isTerminalExecutionStatus,
	type ExecutionStatus,
	type WorkflowExecuteMode,
	type WorkflowExecutionSource,
} from 'n8n-workflow';

export type LedgerEntityType = 'workflow' | 'agent';
export type LedgerEvent = 'started' | 'ended';
/** `none` for `started` rows. `blocked`: the run stopped before its first node. */
export type LedgerOutcome = 'none' | 'success' | 'error' | 'crashed' | 'canceled' | 'blocked';
export type LedgerSource = WorkflowExecutionSource | 'none';

/** The ledger row columns that decide whether a run counts. */
export type LedgerFact = {
	entityType: LedgerEntityType;
	mode: WorkflowExecuteMode;
	source: LedgerSource;
	event: LedgerEvent;
	outcome: LedgerOutcome;
};

/** A finished run, as code outside the ledger sees it. */
export type CompletedRun = {
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
	/** Null while no runner has taken the execution. */
	startedAt: Date | null;
	data?: { resultData?: { failedBeforeStart?: true } };
};

type CountingRule = {
	entityType: Record<LedgerEntityType, boolean>;
	event: Record<LedgerEvent, boolean>;
	outcome: Record<LedgerOutcome, boolean>;
	source: Record<LedgerSource, boolean>;
	mode: Record<WorkflowExecuteMode, boolean>;
};

const billable = {
	entityType: { workflow: true, agent: false },
	event: { started: false, ended: true },
	outcome: {
		success: true,
		error: true,
		crashed: true,

		// Licence & Billing: a run blocked before its first node did no work.
		blocked: false,
		canceled: false,
		none: false,
	},
	source: { none: true, user: true, instance_ai: false },
	mode: {
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
	},
} satisfies CountingRule;

const insightsProduction = {
	entityType: { workflow: true, agent: false },
	event: { started: false, ended: true },
	outcome: {
		success: true,
		error: true,
		crashed: true,
		blocked: true,

		canceled: false,
		none: false,
	},
	source: { none: true, user: true, instance_ai: false },
	mode: {
		cli: true,
		retry: true,
		trigger: true,
		webhook: true,
		evaluation: true,
		error: true,

		integrated: false,
		internal: false,
		manual: false,
		chat: false,
		agent: false,
	},
} satisfies CountingRule;

// Error workflows are operational, not productive work.
const timeSaved = {
	entityType: { workflow: true, agent: false },
	event: { started: false, ended: true },
	outcome: {
		success: true,

		error: false,
		crashed: false,
		blocked: false,
		canceled: false,
		none: false,
	},
	source: { none: true, user: true, instance_ai: false },
	mode: {
		cli: true,
		retry: true,
		trigger: true,
		webhook: true,
		evaluation: true,

		error: false,
		integrated: false,
		internal: false,
		manual: false,
		chat: false,
		agent: false,
	},
} satisfies CountingRule;

// A run counts once, at its start. A blocked run gives its slot back: see executionLimitDelta.
const executionLimit = {
	entityType: { workflow: true, agent: true },
	event: { started: true, ended: false },
	outcome: {
		none: true,

		success: false,
		error: false,
		crashed: false,
		canceled: false,
		blocked: false,
	},
	source: { none: true, user: true, instance_ai: false },
	mode: {
		cli: true,
		retry: true,
		trigger: true,
		webhook: true,
		evaluation: true,
		internal: true,
		agent: true,

		integrated: false,
		error: false,
		manual: false,
		chat: false,
	},
} satisfies CountingRule;

// Own keys only: an unknown value, or one inherited like `constructor`, counts nowhere.
function isOn<K extends string>(map: Record<K, boolean>, key: K): boolean {
	return Object.hasOwn(map, key) && map[key];
}

function matches(rule: CountingRule, fact: LedgerFact): boolean {
	return (
		isOn(rule.entityType, fact.entityType) &&
		isOn(rule.event, fact.event) &&
		isOn(rule.outcome, fact.outcome) &&
		isOn(rule.source, fact.source) &&
		isOn(rule.mode, fact.mode)
	);
}

function isKeyOf<T extends object>(map: T, value: string): value is Extract<keyof T, string> {
	return Object.hasOwn(map, value);
}

/** Narrows a stored ledger row. Unknown values make the row count nowhere. */
export function isLedgerFact(row: Record<keyof LedgerFact, string>): row is LedgerFact {
	return (
		isKeyOf(billable.entityType, row.entityType) &&
		isKeyOf(billable.event, row.event) &&
		isKeyOf(billable.outcome, row.outcome) &&
		isKeyOf(billable.source, row.source) &&
		isKeyOf(billable.mode, row.mode)
	);
}

export function toLedgerOutcome(run: CompletedRun): LedgerOutcome {
	const outcome = isTerminalExecutionStatus(run.status) ? run.status : 'none';
	const isFailure = outcome === 'error' || outcome === 'crashed';
	// A run that no runner took, or that failed before its first node, did no work.
	const didNoWork = run.startedAt === null || run.data?.resultData?.failedBeforeStart === true;
	return isFailure && didNoWork ? 'blocked' : outcome;
}

export function toLedgerFact(run: CompletedRun, source?: WorkflowExecutionSource): LedgerFact {
	return {
		entityType: 'workflow',
		mode: run.mode,
		source: source ?? 'none',
		event: 'ended',
		outcome: toLedgerOutcome(run),
	};
}

function isFact(input: LedgerFact | CompletedRun): input is LedgerFact {
	// `typeof` keeps deep mocks of IRun, which answer every property, on the run path.
	return 'event' in input && typeof input.event === 'string';
}

export function isBillableExecution(fact: LedgerFact): boolean;
export function isBillableExecution(run: CompletedRun, source?: WorkflowExecutionSource): boolean;
export function isBillableExecution(
	input: LedgerFact | CompletedRun,
	source?: WorkflowExecutionSource,
): boolean {
	return matches(billable, isFact(input) ? input : toLedgerFact(input, source));
}

export function isInsightsProduction(fact: LedgerFact): boolean;
export function isInsightsProduction(run: CompletedRun, source?: WorkflowExecutionSource): boolean;
export function isInsightsProduction(
	input: LedgerFact | CompletedRun,
	source?: WorkflowExecutionSource,
): boolean {
	return matches(insightsProduction, isFact(input) ? input : toLedgerFact(input, source));
}

export function savesTime(fact: LedgerFact): boolean {
	return matches(timeSaved, fact);
}

export function countsTowardExecutionLimit(fact: LedgerFact): boolean {
	return matches(executionLimit, fact);
}

/** +1 for a counted start, -1 when that run later ends blocked, else 0. */
export function executionLimitDelta(fact: LedgerFact): -1 | 0 | 1 {
	if (countsTowardExecutionLimit(fact)) return 1;
	if (fact.event !== 'ended' || fact.outcome !== 'blocked') return 0;
	return countsTowardExecutionLimit({ ...fact, event: 'started', outcome: 'none' }) ? -1 : 0;
}
