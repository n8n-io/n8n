import type {
	AgentProposalCaseArm,
	AgentProposalCaseResult,
	SelfHealingAgentResultDetail,
} from '@n8n/api-types';

import type { AgentProposalSelection } from './agentProposal.api';

export const proposalSelection: AgentProposalSelection = {
	type: 'self_healing_agent_result',
	id: 'result-1',
	projectId: 'project-1',
};

export function arm(outcome: 'pass' | 'fail'): AgentProposalCaseArm {
	return {
		status: 'success',
		answer: 'The order is on its way.',
		verdict: { status: 'completed', outcome, reasoning: null },
		toolCalls: [],
		usage: { inputTokens: 10, outputTokens: 5, costUsd: null, durationMs: 100 },
	};
}

export function caseResult(
	overrides: Partial<AgentProposalCaseResult> = {},
): AgentProposalCaseResult {
	return {
		caseKey: 'new:0',
		origin: 'proposal',
		motivating: true,
		input: 'Where is my order?',
		criteria: 'The answer uses the order lookup tool.',
		expectedOutput: null,
		expectedTools: ['order_lookup'],
		published: arm('fail'),
		proposed: arm('pass'),
		...overrides,
	};
}

export function proposal(
	overrides: Partial<SelfHealingAgentResultDetail> = {},
): SelfHealingAgentResultDetail {
	return {
		resultId: proposalSelection.id,
		projectId: proposalSelection.projectId,
		agentId: 'agent-1',
		agentName: 'Support agent',
		summary: 'Clarify the lookup tools',
		report: 'The agent chooses the wrong lookup tool. The tool descriptions are now distinct.',
		goals: ['quality'],
		trigger: 'traces',
		baseVersionId: 'version-1',
		baseVersionPublishedAt: '2026-09-28T09:00:00.000Z',
		traceWindow: {
			start: '2026-10-01T09:00:00.000Z',
			end: '2026-10-09T09:00:00.000Z',
			count: 42,
		},
		edits: [
			{
				kind: 'toolDescription',
				toolType: 'node',
				toolName: 'order_lookup',
				before: 'Looks up data',
				after: 'Looks up an order by its number',
			},
		],
		evalCases: [
			{
				caseKey: 'new:0',
				change: 'added',
				caseId: null,
				before: null,
				motivating: true,
				input: 'Where is my order?',
				criteria: 'The answer uses the order lookup tool.',
				expectedTools: ['order_lookup'],
			},
		],
		evidence: { ranAt: '2026-10-09T09:05:00.000Z', cases: [caseResult()] },
		usage: {
			turns: 3,
			durationSeconds: 45,
			promptTokens: 100,
			completionTokens: 50,
			totalTokens: 150,
		},
		reviewState: 'open',
		appliedAutomatically: false,
		publishedVersionId: null,
		applyProgress: {
			evalsApplied: false,
			savedSkillIds: [],
			savedVersionId: null,
			agentPublished: false,
		},
		applyError: null,
		closedAt: null,
		closedBy: null,
		createdAt: '2026-10-09T09:10:00.000Z',
		updatedAt: '2026-10-09T09:10:00.000Z',
		...overrides,
	};
}
