import { z } from 'zod';

import { Z } from './zod-class';

export interface AgentOnlineCheck {
	id: string;
	kind: 'tool' | 'promise' | 'base';
	question: string;
	reason: string;
	appliesWhen?: string;
	source: { field: 'instructions' | 'skills' | 'tools' | 'base'; quote?: string };
}

export interface AgentOnlineRubric {
	checks: AgentOnlineCheck[];
	generatedAt: string;
	updatedAt?: string;
	/** When a person approved these checks for live monitoring. */
	approvedAt?: string;
}
export const MAX_AGENT_ONLINE_SESSIONS = 10;

export class RunAgentOnlineChecksDto extends Z.class({
	sessionIds: z.array(z.string().min(1)).min(1).max(MAX_AGENT_ONLINE_SESSIONS).optional(),
}) {}

export interface AgentOnlineSession {
	threadId: string;
	title: string;
	origin: string | null;
	updatedAt: string;
}

export type AgentOnlineVerdictStatus = 'pass' | 'fail' | 'not_applicable' | 'unsure' | 'not_run';
export interface AgentOnlineVerdict {
	checkId: string;
	status: AgentOnlineVerdictStatus;
	reason: string;
	moment?: { turnIndex: number; toolCallId?: string };
}
export interface AgentOnlineCase {
	id: number;
	title: string;
	threadId: string | null;
	createdAt: string;
	latestResult: AgentOnlineCaseResult | null;
	recentResults: Array<{ id: number; checkedAt: string; status: 'good' | 'bad' | 'review' }>;
}
export interface AgentOnlineCaseResult {
	id: number;
	caseId: number;
	checkedAt: string;
	rubric: AgentOnlineRubric;
	configHash: string;
	reviews?: Record<string, 'good' | 'bad'>;
	verdicts: AgentOnlineVerdict[];
}
export interface AgentOnlineCasePage {
	items: AgentOnlineCase[];
	hasMore: boolean;
}
export interface AgentOnlineResultPage {
	conversation: Array<{ userMessage: string; reply: string }>;
	items: AgentOnlineCaseResult[];
	hasMore: boolean;
}

export class UpdateAgentOnlineCheckDto extends Z.class({
	question: z.string().trim().min(1).max(2000),
	reason: z.string().trim().min(1).max(4000),
	appliesWhen: z.string().trim().max(2000).nullable(),
}) {}
export class ReviewAgentOnlineCheckDto extends Z.class({
	feedback: z.enum(['good', 'bad']),
}) {}
export interface AgentOnlineActivityItem {
	caseId: number;
	title: string;
	result: AgentOnlineCaseResult;
}
export interface AgentOnlineActivityPage {
	items: AgentOnlineActivityItem[];
	hasMore: boolean;
}

/** One turn of a past session replayed on the current draft. */
export interface AgentOnlineReplayTurn {
	userMessage: string;
	reply: string;
	toolCalls: number;
	runFailed: boolean;
}

/**
 * A past session replayed on the current draft. `before` is the recorded run,
 * judged with the same rubric as `after`, so the two scores compare.
 */
export interface AgentOnlineReplayComparison {
	caseId: number;
	title: string;
	before: AgentOnlineCaseResult;
	after: {
		configHash: string;
		rubric: AgentOnlineRubric;
		verdicts: AgentOnlineVerdict[];
		turns: AgentOnlineReplayTurn[];
		errors: string[];
	};
}
