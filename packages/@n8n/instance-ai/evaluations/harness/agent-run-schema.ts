// ---------------------------------------------------------------------------
// Agent runtime case contract (AGENT-1665, AGENT-1666). Shared with lang-tracer:
// `agentRun` on the case says how its seeded Agent is run, and `userTurns` /
// `sessions` on a scenario say how the simulated user talks to it. The contract
// is written up in agent-perf `docs/plans/2026-11-27-case-contract.md`.
// ---------------------------------------------------------------------------

import { z } from 'zod';

/** `direct`: restore the seeded Agent and run its scenarios against it, with no
 *  assistant turn. A case without `agentRun` is an assistant build, as before. */
export const AGENT_RUN_MODES = ['direct'] as const;

/** Marks a direct run's results in `eval-results.json` (`testCases[].buildPath`),
 *  so lang-tracer keeps them apart from assistant builds. */
export const DIRECT_AGENT_BUILD_PATH = 'agent-direct';

export const DEFAULT_MAX_USER_TURNS = 6;
export const MAX_USER_TURNS = 20;
export const MAX_SESSIONS = 5;

export const AgentRunSchema = z
	.object({
		mode: z.enum(AGENT_RUN_MODES),
		/** The seed id of the Agent under test. Defaults to the first seeded Agent. */
		agent: z.string().min(1).optional(),
		/** AGENT-1666: keep the seeded Agent's memory config. Omitted or false strips
		 *  it, as today. */
		keepMemory: z.boolean().optional(),
		/** AGENT-1666: deep-merged onto the seeded Agent config, for test variants
		 *  (for example episodic memory on vs off). Validated against the Agent
		 *  config schema after the merge. */
		configOverrides: z.record(z.string(), z.unknown()).optional(),
	})
	.strict();

export type AgentRun = z.infer<typeof AgentRunSchema>;

export function isDirectAgentRun(testCase: { agentRun?: AgentRun }): boolean {
	return testCase.agentRun?.mode === 'direct';
}

/** Index in `seed.agents` of the Agent under test: the one `agentRun.agent`
 *  names, else the first. -1 when the seed does not declare it. */
export function agentUnderTestIndex(
	agentRun: AgentRun | undefined,
	seedAgents: Array<{ id: string }>,
): number {
	const wanted = agentRun?.agent;
	if (wanted === undefined) return seedAgents.length > 0 ? 0 : -1;
	return seedAgents.findIndex((agent) => agent.id === wanted);
}

/** Contract fields that load today but do nothing until N4 (memory) lands.
 *  Named so the run can warn instead of failing silently. */
export function pendingAgentRunFields(testCase: { agentRun?: AgentRun }): string[] {
	const pending: Array<[string, boolean]> = [
		['keepMemory', testCase.agentRun?.keepMemory === true],
		['configOverrides', testCase.agentRun?.configOverrides !== undefined],
	];
	return pending.filter(([, set]) => set).map(([field]) => field);
}

/** A simulated user who talks to the Agent for up to `maxTurns` user messages,
 *  steered by `goal`. A session is the same thing in a new thread. */
export const AgentUserTurnsSchema = z
	.object({
		goal: z.string().min(1),
		maxTurns: z.number().int().min(1).max(MAX_USER_TURNS).default(DEFAULT_MAX_USER_TURNS),
	})
	.strict();

export type AgentUserTurns = z.infer<typeof AgentUserTurnsSchema>;

/** Separate pass/fail statements about one Agent run, like a workflow case's
 *  outcomeExpectations. A scenario passes only if all of them hold. */
export const AgentExpectationsSchema = z.array(z.string().min(1));

/** A session may grade what happened in it, e.g. recall in a later session. */
export const AgentSessionSchema = AgentUserTurnsSchema.extend({
	expectations: AgentExpectationsSchema.optional(),
}).strict();

export type AgentSession = z.infer<typeof AgentSessionSchema>;

export const AgentSessionsSchema = z.array(AgentSessionSchema).min(1).max(MAX_SESSIONS);

/** The scenario fields only an Agent run reads. */
export const agentScenarioFields = {
	/** Required (≥1, here or on a session) in direct mode. */
	expectations: AgentExpectationsSchema.optional(),
	/** AGENT-1666: omitted = a single opening message, as today. */
	userTurns: AgentUserTurnsSchema.optional(),
	/** AGENT-1666: one thread per session, all for the same user (episodic memory). */
	sessions: AgentSessionsSchema.optional(),
};

/** Case fields that drive the assistant build. A direct run has no assistant
 *  turn, so each would be silently ignored. */
export const ASSISTANT_ONLY_CASE_KEYS = [
	'conversation',
	'processExpectations',
	'outcomeExpectations',
	'messageBudget',
	'promptVersion',
	'allowUserExecution',
	'requiresMemoryCompaction',
	'credentialFixture',
] as const;

/** Seed fields a direct run does not restore. */
const UNRESTORED_SEED_KEYS = ['messages', 'projects', 'priorRuns', 'recordedRuns'] as const;

export interface CaseIssue {
	path: Array<string | number>;
	message: string;
}

interface TableShape {
	name: string;
	columns: Array<{ name: string; type: string }>;
}

/** The case as the contract checks see it. Loose on purpose: only the keys read here. */
export interface AgentRunCaseView {
	agentRun?: AgentRun;
	seed?: { mode: string; agents?: Array<{ id: string }>; dataTables?: TableShape[] } & Partial<
		Record<string, unknown>
	>;
	executionScenarios?: AgentScenarioView[];
	[key: string]: unknown;
}

/** A scenario as the contract checks and the judge bridge see it. */
export interface AgentScenarioView {
	successCriteria?: string;
	seedDataTables?: TableShape[];
	userTurns?: unknown;
	expectations?: string[];
	sessions?: Array<Partial<AgentSession>>;
}

/** Every expectation of a scenario: its own, then each session's, in order. */
export function scenarioExpectations(scenario: AgentScenarioView): string[] {
	return [
		...(scenario.expectations ?? []),
		...(scenario.sessions ?? []).flatMap((session) => session.expectations ?? []),
	];
}

/** One graded expectation of an Agent scenario. `key` names the unit in pass
 *  rates and the baseline comparison; `text` is what the judge reads. */
export interface AgentExpectationUnit {
	key: string;
	text: string;
}

/** Separates the parts of an expectation unit key. */
export const EXPECTATION_KEY_SEPARATOR = ' › ';

/**
 * Every expectation of a scenario as its own unit: the scenario's, then each
 * session's. Keyed `<scenario> › <expectation>`, and `<scenario> › session <n>
 * › <expectation>` for a session's, so the same text in two scenarios or two
 * sessions stays two units.
 */
export function agentExpectationUnits(
	scenario: AgentScenarioView & { name: string },
): AgentExpectationUnit[] {
	const join = (...parts: string[]) => parts.join(EXPECTATION_KEY_SEPARATOR);
	const own = (scenario.expectations ?? []).map((text) => ({
		key: join(scenario.name, text),
		text,
	}));
	const perSession = (scenario.sessions ?? []).flatMap((session, index) => {
		const label = `session ${String(index + 1)}`;
		return (session.expectations ?? []).map((text) => ({
			key: join(scenario.name, label, text),
			text: `In ${label}: ${text}`,
		}));
	});
	return [...own, ...perSession];
}

/** A scenario graded by its expectations is not a scored unit itself: its
 *  expectations are. Its row stays, for display and for runs that never reached
 *  the judge (framework issues). */
export function isExpectationGraded(scenario: AgentScenarioView & { name: string }): boolean {
	return agentExpectationUnits(scenario).length > 0;
}

/** `false` turns a flag off, which is the same as leaving it out. */
function isPresent(value: unknown): boolean {
	if (value === undefined || value === null || value === false) return false;
	return !Array.isArray(value) || value.length > 0;
}

function assistantOnlyIssues(c: AgentRunCaseView): CaseIssue[] {
	return ASSISTANT_ONLY_CASE_KEYS.filter((key) => isPresent(c[key])).map((key) => ({
		path: [key],
		message: `${key} drives the assistant build, which agentRun.mode direct skips — remove it`,
	}));
}

function seedIssues(c: AgentRunCaseView): CaseIssue[] {
	const seed = c.seed;
	if (seed?.mode !== 'inline' || (seed.agents ?? []).length === 0) {
		return [
			{
				path: ['seed'],
				message:
					'agentRun.mode direct runs a seeded Agent — the case needs an inline seed with at least one entry in seed.agents',
			},
		];
	}
	return UNRESTORED_SEED_KEYS.filter((key) => isPresent(seed[key])).map((key) => ({
		path: ['seed', key],
		message: `seed.${key} is not restored by agentRun.mode direct — remove it`,
	}));
}

function agentRefIssues(c: AgentRunCaseView): CaseIssue[] {
	const wanted = c.agentRun?.agent;
	if (wanted === undefined || c.seed?.mode !== 'inline') return [];
	if ((c.seed.agents ?? []).some((agent) => agent.id === wanted)) return [];
	return [
		{
			path: ['agentRun', 'agent'],
			message: `agentRun.agent "${wanted}" is not the id of an Agent the inline seed declares`,
		},
	];
}

function scenarioCountIssues(c: AgentRunCaseView): CaseIssue[] {
	if ((c.executionScenarios ?? []).length > 0) return [];
	return [
		{
			path: ['executionScenarios'],
			message:
				'agentRun.mode direct grades the Agent by its runs — add at least one executionScenario',
		},
	];
}

function scenarioTurnIssues(c: AgentRunCaseView): CaseIssue[] {
	return (c.executionScenarios ?? []).flatMap((scenario, index): CaseIssue[] => {
		const hasTurns = scenario.userTurns !== undefined;
		const hasSessions = scenario.sessions !== undefined;
		const hasExpectations = scenario.expectations !== undefined;
		if (!hasTurns && !hasSessions && !hasExpectations) return [];
		if (!c.agentRun) {
			return [
				{
					path: ['executionScenarios', index],
					message:
						'userTurns, sessions and expectations drive an Agent run — they need agentRun on the case',
				},
			];
		}
		if (!hasTurns || !hasSessions) return [];
		return [
			{
				path: ['executionScenarios', index],
				message: 'a scenario takes userTurns or sessions, not both — each session has its own goal',
			},
		];
	});
}

function sameColumns(a: TableShape, b: TableShape): boolean {
	return JSON.stringify(a.columns) === JSON.stringify(b.columns);
}

/** A scenario table with a seed table's name fills that table, so its columns
 *  must be the seed table's: otherwise its rows do not fit the table the Agent uses. */
function scenarioTableIssues(c: AgentRunCaseView): CaseIssue[] {
	const seedTables = c.seed?.mode === 'inline' ? (c.seed.dataTables ?? []) : [];
	return (c.executionScenarios ?? []).flatMap((scenario, index) =>
		(scenario.seedDataTables ?? []).flatMap((table, tableIndex) => {
			const seeded = seedTables.find((seedTable) => seedTable.name === table.name);
			if (!seeded || sameColumns(seeded, table)) return [];
			return [
				{
					path: ['executionScenarios', index, 'seedDataTables', tableIndex, 'columns'],
					message: `scenario table "${table.name}" fills the seed table of that name, so it needs the same columns`,
				},
			];
		}),
	);
}

/** Direct runs are graded by expectations; `successCriteria` is only a summary. */
function scenarioExpectationIssues(c: AgentRunCaseView): CaseIssue[] {
	return (c.executionScenarios ?? []).flatMap((scenario, index) =>
		scenarioExpectations(scenario).length > 0
			? []
			: [
					{
						path: ['executionScenarios', index, 'expectations'],
						message:
							'agentRun.mode direct grades each scenario by its expectations — add at least one, on the scenario or on a session',
					},
				],
	);
}

/** Outside direct mode `successCriteria` is what gets graded, so it stays required. */
function successCriteriaIssues(c: AgentRunCaseView): CaseIssue[] {
	return (c.executionScenarios ?? []).flatMap((scenario, index) =>
		scenario.successCriteria === undefined
			? [{ path: ['executionScenarios', index, 'successCriteria'], message: 'Required' }]
			: [],
	);
}

/** Every way a case breaks the agent runtime contract. Empty when it holds. */
export function findAgentRunIssues(c: AgentRunCaseView): CaseIssue[] {
	const turnIssues = scenarioTurnIssues(c);
	if (c.agentRun?.mode !== 'direct') return [...successCriteriaIssues(c), ...turnIssues];
	return [
		...assistantOnlyIssues(c),
		...seedIssues(c),
		...agentRefIssues(c),
		...scenarioCountIssues(c),
		...scenarioExpectationIssues(c),
		...scenarioTableIssues(c),
		...turnIssues,
	];
}
