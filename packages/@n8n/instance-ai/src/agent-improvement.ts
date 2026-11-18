import {
	AGENT_PROPOSAL_MAX_CASES,
	agentProposalEditInputSchema,
	agentProposalEvalCaseInputSchema,
} from '@n8n/api-types';
import { z } from 'zod';

export const AGENT_IMPROVEMENT_PROFILE_VERSION = 'agent-improvement-v1';

/** The length that `check_report` accepts: approximately 120 words. */
export const AGENT_IMPROVEMENT_REPORT_MAX_LENGTH = 900;

/**
 * The input of `check_report`. A tool input that fails validation goes back to the model,
 * so the model can shorten the report. A structured output that fails validation ends the
 * run without a result, so the output schema does not have this limit.
 */
export const agentImprovementCheckReportInputSchema = z
	.object({
		report: z
			.string()
			.trim()
			.min(1)
			.max(AGENT_IMPROVEMENT_REPORT_MAX_LENGTH)
			.describe('The complete report text for the agent owner.'),
	})
	.strict();

export const agentImprovementOutputSchema = z
	.object({
		outcome: z
			.enum(['proposal', 'no_change'])
			.describe(
				'proposal: the last successful test_proposal call is ready for review. ' +
					'no_change: nothing is worth changing.',
			),
		summary: z
			.string()
			.trim()
			.min(1)
			.transform((summary) => Array.from(summary).slice(0, 80).join(''))
			.describe(
				'Short, plain-language title. Aim for 5–10 words, at most 80 characters. Do not use Markdown.',
			),
		report: z
			.string()
			.trim()
			.min(1)
			.max(50_000)
			.describe(
				`The report text that check_report accepted: Markdown with bold section titles, short paragraphs, and bullets where useful, at most ${AGENT_IMPROVEMENT_REPORT_MAX_LENGTH} characters, ` +
					'Use the sections What happened, Proposed changes, and Test results. Distinguish proposed changes from applied changes.',
			),
	})
	.strict();

export type AgentImprovementOutput = z.infer<typeof agentImprovementOutputSchema>;

export type AgentImprovementThreadMetadata = {
	agentImprovement: {
		backgroundUserId: string;
		projectId: string;
		agentId: string;
		investigationId: string;
	};
	profileVersion: typeof AGENT_IMPROVEMENT_PROFILE_VERSION;
};

/** The Tool builder requires an input schema, so a tool without parameters uses this one. */
export const agentImprovementNoInputSchema = z.object({});

export const agentImprovementListSessionsInputSchema = z
	.object({
		limit: z.number().int().min(1).max(50).default(20).describe('Number of sessions in this page.'),
		offset: z.number().int().min(0).default(0).describe('Number of sessions to skip.'),
	})
	.strict();

export const agentImprovementReadSessionInputSchema = z
	.object({
		sessionId: z
			.string()
			.min(1)
			.describe('The sessionId of a session from list_production_sessions.'),
	})
	.strict();

export const agentImprovementTestProposalInputSchema = z
	.object({
		edits: z
			.array(agentProposalEditInputSchema)
			.max(20)
			.describe(
				'Edits to the published agent. `after` is the complete new text of the field. ' +
					'Leave empty for a proposal that changes only the eval suite.',
			),
		evalCases: z
			.array(agentProposalEvalCaseInputSchema)
			.max(AGENT_PROPOSAL_MAX_CASES)
			.describe(
				'Eval cases to add to the suite, or to update when caseId is set. Each case runs in this test. ' +
					'Set motivating to true on the case that shows the behavior behind the proposal.',
			),
		regressionCaseIds: z
			.array(z.string().min(1).max(128))
			.max(AGENT_PROPOSAL_MAX_CASES)
			.describe(
				'caseId values from list_eval_cases to run without a change, to show that nothing else got worse.',
			),
	})
	.strict()
	.superRefine((input, ctx) => {
		const total = input.evalCases.length + input.regressionCaseIds.length;
		if (total < 1) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Give at least one case to run.' });
		}
		if (total > AGENT_PROPOSAL_MAX_CASES) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Give at most ${AGENT_PROPOSAL_MAX_CASES} cases.`,
			});
		}
		if (input.edits.length === 0 && input.evalCases.length === 0) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Give an edit or an eval case.' });
		}
	});

export type AgentImprovementListSessionsInput = z.infer<
	typeof agentImprovementListSessionsInputSchema
>;
export type AgentImprovementReadSessionInput = z.infer<
	typeof agentImprovementReadSessionInputSchema
>;
export type AgentImprovementTestProposalInput = z.infer<
	typeof agentImprovementTestProposalInputSchema
>;

/**
 * The host binds these callbacks to one investigation and owns the result shapes.
 * The agent sends each result to the model as untrusted data.
 */
export type AgentImprovementHostTools = {
	getAgentDefinition: (abortSignal?: AbortSignal) => Promise<unknown>;
	listEvalCases: (abortSignal?: AbortSignal) => Promise<unknown>;
	listProductionSessions: (
		input: AgentImprovementListSessionsInput,
		abortSignal?: AbortSignal,
	) => Promise<unknown>;
	readProductionSession: (
		input: AgentImprovementReadSessionInput,
		abortSignal?: AbortSignal,
	) => Promise<unknown>;
	testProposal: (
		input: AgentImprovementTestProposalInput,
		abortSignal?: AbortSignal,
	) => Promise<unknown>;
};
