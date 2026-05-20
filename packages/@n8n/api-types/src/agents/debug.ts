import { z } from 'zod';

import { Z } from '../zod-class';

export type AgentDebugSignalType =
	| 'failed_run'
	| 'slow_run'
	| 'high_cost'
	| 'tool_failure'
	| 'empty_tool_output'
	| 'human_input_required'
	| 'empty_response';

export type AgentDebugSignalSeverity = 'info' | 'warning' | 'error';

export interface AgentDebugSignal {
	type: AgentDebugSignalType;
	severity: AgentDebugSignalSeverity;
	label: string;
	description: string;
	count: number;
}

export const agentReviewStatusSchema = z.enum(['approved', 'rejected']);

export type AgentReviewStatus = z.infer<typeof agentReviewStatusSchema>;

export const AGENT_REVIEW_REJECTION_REASONS = [
	'wrong_answer',
	'wrong_tool_calling',
	'other',
] as const;

export const DEFAULT_AGENT_REVIEW_REJECTION_REASON = 'wrong_answer';

export const agentReviewRejectionReasonSchema = z.enum(AGENT_REVIEW_REJECTION_REASONS);

export type AgentReviewRejectionReason = z.infer<typeof agentReviewRejectionReasonSchema>;

export const agentReviewToolCallCorrectionSchema = z.object({
	removeToolCalls: z
		.array(
			z.object({
				id: z.string().min(1),
				name: z.string().min(1),
			}),
		)
		.default([]),
	addToolNames: z.array(z.string().min(1)).default([]),
});

export type AgentReviewToolCallCorrection = z.infer<typeof agentReviewToolCallCorrectionSchema>;

export interface AgentReviewCase {
	id: string;
	projectId: string;
	agentId: string;
	agentVersionId: string;
	conversationId: string;
	executionId: string;
	status: AgentReviewStatus;
	rejectionReason: AgentReviewRejectionReason | null;
	toolCallCorrection: AgentReviewToolCallCorrection | null;
	input: string;
	expectedOutput: string;
	actualOutput: string;
	notes: string | null;
	createdById: string | null;
	updatedById: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AgentReviewSummary {
	total: number;
	approved: number;
	rejected: number;
}

export interface AgentReviewCasesResponse {
	cases: AgentReviewCase[];
	summary: AgentReviewSummary;
	nextCursor: string | null;
}

export class UpsertAgentReviewCaseDto extends Z.class({
	status: agentReviewStatusSchema,
	rejectionReason: agentReviewRejectionReasonSchema.optional(),
	toolCallCorrection: agentReviewToolCallCorrectionSchema.optional(),
	expectedOutput: z.string().optional(),
	notes: z.string().max(2000).optional(),
}) {}

export interface AgentDebugRun {
	id: string;
	threadId: string;
	sessionNumber: number;
	sessionTitle: string | null;
	agentVersionId: string;
	status: 'success' | 'error';
	createdAt: string;
	startedAt: string | null;
	stoppedAt: string | null;
	duration: number;
	userMessage: string;
	assistantResponse: string;
	model: string | null;
	promptTokens: number | null;
	completionTokens: number | null;
	totalTokens: number | null;
	cost: number | null;
	error: string | null;
	hitlStatus: 'suspended' | 'resumed' | null;
	source: string | null;
	signals: AgentDebugSignal[];
	review: AgentReviewCase | null;
}

export interface AgentDebugRunVersionSummary {
	agentVersionId: string;
	total: number;
	latestRunAt: string | null;
}

export type AgentDebugTimelineEvent = Record<string, unknown> & { type: string };

export interface AgentDebugToolCall {
	name: string;
	input: unknown;
	output: unknown;
}

export interface AgentDebugRunDetail extends AgentDebugRun {
	toolCalls: AgentDebugToolCall[] | null;
	timeline: AgentDebugTimelineEvent[] | null;
	workingMemory: string | null;
}

export interface AgentDebugRunsResponse {
	runs: AgentDebugRun[];
	versions: AgentDebugRunVersionSummary[];
	nextCursor: string | null;
}

export interface AgentDebugInsight {
	type: AgentDebugSignalType;
	severity: AgentDebugSignalSeverity;
	label: string;
	description: string;
	count: number;
	latestRunId: string;
}

export interface AgentDebugInsightsResponse {
	totalRuns: number;
	totalSignals: number;
	errorRate: number;
	averageDuration: number;
	totalCost: number;
	insights: AgentDebugInsight[];
}
