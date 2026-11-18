import { z } from 'zod';

import { agentEvalExpectedToolsSchema, agentEvalVerdictSchema } from './schemas/agent-evals.schema';
import type { SelfHealingResultUsage } from './self-healing-results';
import { Z } from './zod-class';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** `none` means that the configuration covers no agent. */
export const selfHealingAgentScopeSchema = z.enum(['none', 'all', 'selected']);
export type SelfHealingAgentScope = z.infer<typeof selfHealingAgentScopeSchema>;

/** The order of the options is the stored order of a goal list. */
export const selfHealingAgentGoalSchema = z.enum(['quality', 'cost', 'latency']);
export type SelfHealingAgentGoal = z.infer<typeof selfHealingAgentGoalSchema>;

/** Returns the goals in the stored order, without duplicates. The list always has `quality`. */
export function normalizeSelfHealingAgentGoals(
	goals: readonly SelfHealingAgentGoal[],
): SelfHealingAgentGoal[] {
	return selfHealingAgentGoalSchema.options.filter(
		(goal) => goal === 'quality' || goals.includes(goal),
	);
}

/** `approval` waits for a reviewer. `auto` applies each prepared proposal. */
export const selfHealingAgentPublicationModeSchema = z.enum(['approval', 'auto']);
export type SelfHealingAgentPublicationMode = z.infer<typeof selfHealingAgentPublicationModeSchema>;

export const SELF_HEALING_AGENT_SCHEDULE_HOURS = { min: 1, max: 720 } as const;
/** A production trace is one production session: one conversation with the published agent. */
export const SELF_HEALING_AGENT_TRACE_THRESHOLD = { min: 1, max: 10_000 } as const;

/** The trigger values that the configuration form sets when the user turns agent coverage on. */
export const SELF_HEALING_AGENT_TRIGGER_DEFAULTS = {
	scheduleIntervalHours: 24,
	traceThreshold: 50,
} as const;

/** True when the fields break the rule that agent coverage needs a trigger. */
export function isSelfHealingAgentTriggerMissing(configuration: {
	agentScope: SelfHealingAgentScope;
	agentScheduleIntervalHours: number | null;
	agentTraceThreshold: number | null;
}): boolean {
	return (
		configuration.agentScope !== 'none' &&
		configuration.agentScheduleIntervalHours === null &&
		configuration.agentTraceThreshold === null
	);
}

/**
 * The agent fields of a self-healing configuration.
 * A `null` trigger is off. A configuration that covers agents needs one trigger or both.
 * `agentTraceThreshold` is a number of production sessions that have new activity.
 * An investigation always improves quality. `agentGoals` can add `cost` and `latency`.
 */
export const selfHealingAgentConfigurationShape = {
	agentScope: selfHealingAgentScopeSchema.default('none'),
	agentIds: z.array(z.string().min(1).max(36)).default([]),
	agentGoals: z
		.array(selfHealingAgentGoalSchema)
		.max(selfHealingAgentGoalSchema.options.length)
		.refine((goals) => new Set(goals).size === goals.length, {
			message: 'Each goal can occur one time only.',
		})
		.default(['quality'])
		.transform(normalizeSelfHealingAgentGoals),
	agentScheduleIntervalHours: z
		.number()
		.int()
		.min(SELF_HEALING_AGENT_SCHEDULE_HOURS.min)
		.max(SELF_HEALING_AGENT_SCHEDULE_HOURS.max)
		.nullable()
		.default(null),
	agentTraceThreshold: z
		.number()
		.int()
		.min(SELF_HEALING_AGENT_TRACE_THRESHOLD.min)
		.max(SELF_HEALING_AGENT_TRACE_THRESHOLD.max)
		.nullable()
		.default(null),
	agentPublicationMode: selfHealingAgentPublicationModeSchema.default('approval'),
};

export type SelfHealingConfigurationAgentOption = {
	id: string;
	name: string;
	/** Only a published agent can be investigated. */
	published: boolean;
};

export class StartSelfHealingAgentInvestigationDto extends Z.class({
	agentId: z.string().min(1).max(36),
}) {}

/**
 * `started`: a new investigation runs in the background.
 * `already_running`: an investigation of this agent is not finished.
 * `open_proposal`: a proposal for this agent waits for a decision. `resultId` identifies it.
 * `not_eligible`: the investigation cannot start. `reason` tells the user why.
 */
export type StartSelfHealingAgentInvestigationResponse =
	| { status: 'started' }
	| { status: 'already_running' }
	| { status: 'open_proposal'; resultId: string }
	| { status: 'not_eligible'; reason: SelfHealingAgentIneligibleReason };

export const selfHealingAgentIneligibleReasonSchema = z.enum([
	/** The configuration is paused or does not cover the agent. */
	'not_covered',
	/** The agent has no published version, or it is archived. */
	'not_published',
	/** The agent draft has changes that are not published. */
	'unpublished_changes',
	/** The instance cannot test agent changes (for example, queue mode or a disabled module). */
	'testing_unavailable',
	/** The user whose access the investigation uses lost the necessary access. */
	'no_access',
	/** The Assistant cannot start another run now. */
	'busy',
]);
export type SelfHealingAgentIneligibleReason = z.infer<
	typeof selfHealingAgentIneligibleReasonSchema
>;

// ---------------------------------------------------------------------------
// Investigation
// ---------------------------------------------------------------------------

/**
 * `traces` means that enough production sessions had new activity.
 * `both` means that the schedule and the session count were due in the same check.
 */
export const selfHealingAgentTriggerSchema = z.enum(['schedule', 'traces', 'both', 'manual']);
export type SelfHealingAgentTrigger = z.infer<typeof selfHealingAgentTriggerSchema>;

/**
 * `proposal`: the investigation saved a proposal.
 * `no_change`: the investigation found nothing worth changing. It has no Inbox item.
 * `failed`: the investigation did not produce an accepted outcome.
 */
export const selfHealingAgentInvestigationOutcomeSchema = z.enum([
	'proposal',
	'no_change',
	'failed',
]);
export type SelfHealingAgentInvestigationOutcome = z.infer<
	typeof selfHealingAgentInvestigationOutcomeSchema
>;

// ---------------------------------------------------------------------------
// Proposal: agent edits
// ---------------------------------------------------------------------------

const MAX_EDIT_TEXT = 100_000;

/** Tool kinds whose description is in the agent configuration. Custom tools are not supported. */
export const agentProposalToolTypeSchema = z.enum(['node', 'workflow', 'mcp']);
export type AgentProposalToolType = z.infer<typeof agentProposalToolTypeSchema>;

/**
 * An edit as the investigator proposes it. `after` is the complete new value of the field.
 * The backend reads `before` from the published version, so the model cannot supply it.
 */
export const agentProposalEditInputSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('instructions'),
		after: z.string().trim().min(1).max(MAX_EDIT_TEXT),
	}),
	z.object({
		kind: z.literal('toolDescription'),
		toolType: agentProposalToolTypeSchema,
		/** The tool name as the model sees it. For `mcp`, the server name. */
		toolName: z.string().min(1).max(256),
		after: z.string().trim().min(1).max(MAX_EDIT_TEXT),
	}),
	z.object({
		kind: z.literal('skill'),
		skillId: z.string().min(1).max(64),
		field: z.enum(['description', 'instructions']),
		after: z.string().trim().min(1).max(MAX_EDIT_TEXT),
	}),
]);
export type AgentProposalEditInput = z.infer<typeof agentProposalEditInputSchema>;

/** A tested edit. `before` is the value in the published version that the test used. */
export const agentProposalEditSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('instructions'),
		before: z.string(),
		after: z.string(),
	}),
	z.object({
		kind: z.literal('toolDescription'),
		toolType: agentProposalToolTypeSchema,
		toolName: z.string(),
		/** `null` when the tool had no description. */
		before: z.string().nullable(),
		after: z.string(),
	}),
	z.object({
		kind: z.literal('skill'),
		skillId: z.string(),
		skillName: z.string(),
		field: z.enum(['description', 'instructions']),
		before: z.string(),
		after: z.string(),
	}),
]);
export type AgentProposalEdit = z.infer<typeof agentProposalEditSchema>;

// ---------------------------------------------------------------------------
// Proposal: eval cases
// ---------------------------------------------------------------------------

const MAX_CASE_TEXT = 20_000;

const agentProposalEvalCaseContentSchema = z.object({
	input: z.string().trim().min(1).max(MAX_CASE_TEXT),
	/** The rule that the answer must satisfy. */
	criteria: z.string().trim().min(1).max(MAX_CASE_TEXT).nullable(),
	expectedTools: agentEvalExpectedToolsSchema,
});
export type AgentProposalEvalCaseContent = z.infer<typeof agentProposalEvalCaseContentSchema>;

/**
 * An eval case as the investigator proposes it.
 * `caseId` identifies an existing case of the suite to update. Omit it for a new case.
 */
export const agentProposalEvalCaseInputSchema = agentProposalEvalCaseContentSchema
	.extend({
		caseId: z.string().min(1).max(128).optional(),
		/** True for the case that shows the behavior that motivated the proposal. */
		motivating: z.boolean().default(false),
	})
	.refine((value) => value.criteria !== null || value.expectedTools.length > 0, {
		message: 'A case needs a rule or expected tools.',
	});
export type AgentProposalEvalCaseInput = z.infer<typeof agentProposalEvalCaseInputSchema>;

/** A tested eval case change. `before` is `null` for an added case. */
export const agentProposalEvalCaseSchema = agentProposalEvalCaseContentSchema.extend({
	/** Identifies the case in `AgentProposalEvidence`. */
	caseKey: z.string(),
	change: z.enum(['added', 'updated']),
	/** The suite case that an `updated` change replaces. */
	caseId: z.string().nullable(),
	before: agentProposalEvalCaseContentSchema.nullable(),
	motivating: z.boolean(),
});
export type AgentProposalEvalCase = z.infer<typeof agentProposalEvalCaseSchema>;

/** An existing case of the agent eval suite, as the investigator reads it. */
export type AgentEvalSuiteCase = {
	/** Stable identity: `<datasetId>:<rowId>`. */
	caseId: string;
	input: string;
	criteria: string | null;
	expectedOutput: string | null;
	expectedTools: string[];
};

// ---------------------------------------------------------------------------
// Proposal: evidence
// ---------------------------------------------------------------------------

export const agentProposalToolCallSchema = z.object({
	/** The tool name as the model called it. */
	tool: z.string(),
	kind: z.enum(['node', 'workflow', 'custom', 'mcp', 'other']),
	input: z.unknown().optional(),
	output: z.unknown().optional(),
	/** True when the tool call failed. The error text is internal and not stored. */
	failed: z.boolean(),
});
export type AgentProposalToolCall = z.infer<typeof agentProposalToolCallSchema>;

export const agentProposalCaseUsageSchema = z.object({
	inputTokens: z.number().int().nonnegative().nullable(),
	outputTokens: z.number().int().nonnegative().nullable(),
	/** An estimate in USD for the agent model calls. `null` when no price is known. */
	costUsd: z.number().nonnegative().nullable(),
	/** The total time of the agent model calls. */
	durationMs: z.number().nonnegative().nullable(),
});
export type AgentProposalCaseUsage = z.infer<typeof agentProposalCaseUsageSchema>;

/** One version's run of one case. */
export const agentProposalCaseArmSchema = z.object({
	/** `error` means that the run did not finish. It is not a failed check. */
	status: z.enum(['success', 'error']),
	answer: z.string().nullable(),
	/** `verdict.toolCheck` holds the tool expectation check, when the case expects tools. */
	verdict: agentEvalVerdictSchema,
	toolCalls: z.array(agentProposalToolCallSchema),
	usage: agentProposalCaseUsageSchema,
});
export type AgentProposalCaseArm = z.infer<typeof agentProposalCaseArmSchema>;

export const agentProposalCaseResultSchema = z.object({
	caseKey: z.string(),
	/** `suite`: an unchanged case of the suite. `proposal`: a case that the proposal adds or updates. */
	origin: z.enum(['suite', 'proposal']),
	motivating: z.boolean(),
	input: z.string(),
	criteria: z.string().nullable(),
	expectedOutput: z.string().nullable(),
	expectedTools: z.array(z.string()),
	/** The currently published agent. */
	published: agentProposalCaseArmSchema,
	/** The published agent with the proposed edits. `null` when the proposal has no agent edit. */
	proposed: agentProposalCaseArmSchema.nullable(),
});
export type AgentProposalCaseResult = z.infer<typeof agentProposalCaseResultSchema>;

/**
 * The stored test results of a proposal. Both versions ran the same cases with the same checks
 * and the same mocked tool data.
 */
export const agentProposalEvidenceSchema = z.object({
	ranAt: z.string(),
	cases: z.array(agentProposalCaseResultSchema),
});
export type AgentProposalEvidence = z.infer<typeof agentProposalEvidenceSchema>;

/** The maximum number of cases in one comparison. */
export const AGENT_PROPOSAL_MAX_CASES = 25;

/** True when the check of the arm passed. A skipped or failed check is not a pass. */
export function isAgentProposalArmPass(arm: AgentProposalCaseArm): boolean {
	return (
		arm.status === 'success' && arm.verdict.status === 'completed' && arm.verdict.outcome === 'pass'
	);
}

/** True when the published version passed the case and the proposed version did not. */
export function isAgentProposalRegression(result: AgentProposalCaseResult): boolean {
	return (
		result.proposed !== null &&
		isAgentProposalArmPass(result.published) &&
		!isAgentProposalArmPass(result.proposed)
	);
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type SelfHealingAgentReviewState = 'open' | 'applied' | 'outdated' | 'dismissed';

/** Which parts of a proposal are applied. A retry does the parts that are still `false`. */
export const selfHealingAgentApplyProgressSchema = z.object({
	evalsApplied: z.boolean(),
	/** IDs of the skills that the apply saved. */
	savedSkillIds: z.array(z.string()),
	/** The agent version that the apply saved and must publish. */
	savedVersionId: z.string().nullable(),
	agentPublished: z.boolean(),
});
export type SelfHealingAgentApplyProgress = z.infer<typeof selfHealingAgentApplyProgressSchema>;

export type SelfHealingAgentResultDetail = {
	resultId: string;
	projectId: string;
	agentId: string;
	agentName: string;
	/** A plain-language title with at most 80 characters. */
	summary: string;
	/** Markdown. */
	report: string;
	/** The aims of the investigation, in the stored order. The first one is `quality`. */
	goals: SelfHealingAgentGoal[];
	trigger: SelfHealingAgentTrigger;
	/** The published agent version that the investigation read and tested. */
	baseVersionId: string;
	/** When that version was published. `null` when the time is not known. */
	baseVersionPublishedAt: string | null;
	/** `count` is the number of production sessions that had a turn in the window. */
	traceWindow: { start: string | null; end: string; count: number };
	edits: AgentProposalEdit[];
	evalCases: AgentProposalEvalCase[];
	evidence: AgentProposalEvidence | null;
	usage: SelfHealingResultUsage;
	reviewState: SelfHealingAgentReviewState;
	/** True when the "Publish everything" mode applied the proposal without a reviewer. */
	appliedAutomatically: boolean;
	/** The agent version that the apply published. `null` when the proposal has no agent edit. */
	publishedVersionId: string | null;
	applyProgress: SelfHealingAgentApplyProgress;
	/** The reason why the last apply did not finish. `null` when no apply failed. */
	applyError: string | null;
	closedAt: string | null;
	closedBy: { id: string; firstName: string | null; lastName: string | null } | null;
	createdAt: string;
	updatedAt: string;
};
