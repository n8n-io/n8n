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

/** Contract fields that load today but do nothing until N3 (multi-turn) and N4
 *  (memory) land. Named so the run can warn instead of failing silently. */
export function pendingAgentRunFields(testCase: {
	agentRun?: AgentRun;
	executionScenarios?: Array<Partial<Record<'userTurns' | 'sessions', unknown>>>;
}): string[] {
	const scenarios = testCase.executionScenarios ?? [];
	const pending: Array<[string, boolean]> = [
		['keepMemory', testCase.agentRun?.keepMemory === true],
		['configOverrides', testCase.agentRun?.configOverrides !== undefined],
		['userTurns', scenarios.some((scenario) => scenario.userTurns !== undefined)],
		['sessions', scenarios.some((scenario) => scenario.sessions !== undefined)],
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

export const AgentSessionsSchema = z.array(AgentUserTurnsSchema).min(1).max(MAX_SESSIONS);

/** The scenario fields only an Agent run reads. */
export const agentScenarioFields = {
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

/** The case as the contract checks see it. Loose on purpose: only the keys read here. */
export interface AgentRunCaseView {
	agentRun?: AgentRun;
	seed?: { mode: string; agents?: Array<{ id: string }> } & Partial<Record<string, unknown>>;
	executionScenarios?: Array<Partial<Record<'userTurns' | 'sessions', unknown>>>;
	[key: string]: unknown;
}

function isPresent(value: unknown): boolean {
	if (value === undefined || value === null) return false;
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
		if (!hasTurns && !hasSessions) return [];
		if (!c.agentRun) {
			return [
				{
					path: ['executionScenarios', index],
					message: 'userTurns and sessions drive an Agent run — they need agentRun on the case',
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

/** Every way a case breaks the agent runtime contract. Empty when it holds. */
export function findAgentRunIssues(c: AgentRunCaseView): CaseIssue[] {
	const turnIssues = scenarioTurnIssues(c);
	if (c.agentRun?.mode !== 'direct') return turnIssues;
	return [
		...assistantOnlyIssues(c),
		...seedIssues(c),
		...agentRefIssues(c),
		...scenarioCountIssues(c),
		...turnIssues,
	];
}
