import type { SelfHealingResultDetail, WorkflowSuggestionProposalDetail } from '@n8n/api-types';

import type { SelfHealingSelection } from './selfHealingResults.api';

export const resultSelection: SelfHealingSelection = {
	type: 'self_healing_result',
	id: 'result-1',
	workflowId: 'workflow-1',
	projectId: 'project-1',
};

export function suggestion(
	overrides: Partial<WorkflowSuggestionProposalDetail> = {},
): WorkflowSuggestionProposalDetail {
	const original = {
		name: 'Daily report',
		nodes: [
			{
				id: 'node-1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
		],
		connections: {},
	};
	const candidate = {
		nodes: [
			...original.nodes,
			{
				id: 'node-2',
				name: 'Finish',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [200, 0] as [number, number],
				parameters: {},
			},
		],
		connections: {},
	};
	return {
		suggestionId: 'suggestion-1',
		workflowId: resultSelection.workflowId,
		projectId: resultSelection.projectId,
		backgroundUserId: 'background-user',
		expectedBaseline: {
			savedVersionId: 'original',
			publishedVersionId: 'original',
			checksum: 'checksum',
			versionCounter: 1,
			latestPublishHistoryEventId: null,
		},
		state: 'pending',
		closedReason: null,
		resultKind: 'fix_ready',
		appliedVersion: null,
		author: 'assistant',
		payload: {
			original,
			candidate,
			proposed: { ...original, ...candidate },
			explanation: 'Add the missing step',
			errorContext: { summary: 'The last step did not run', evidenceReference: null },
		},
		activity: [
			{
				id: 'event-1',
				action: 'submitted',
				author: 'assistant',
				actorId: null,
				createdAt: '2026-10-09T09:00:00.000Z',
			},
		],
		...overrides,
	};
}

export function result(overrides: Partial<SelfHealingResultDetail> = {}): SelfHealingResultDetail {
	return {
		resultId: resultSelection.id,
		workflowId: resultSelection.workflowId,
		projectId: resultSelection.projectId,
		backgroundUserId: 'background-user',
		outcome: 'fix_ready',
		summary: 'Restore the last step',
		report: 'The workflow stops before the last step. Review the proposed connection.',
		usage: {
			credits: null,
			turns: 3,
			durationSeconds: 45,
			promptTokens: 100,
			completionTokens: 50,
			totalTokens: 150,
		},
		completedAt: '2026-10-09T09:00:00.000Z',
		createdAt: '2026-10-09T09:00:00.000Z',
		updatedAt: '2026-10-09T09:00:00.000Z',
		dismissedAt: null,
		dismissedById: null,
		reviewState: 'open',
		suggestion: suggestion(),
		execution: { status: 'available', id: 'execution-1' },
		...overrides,
	};
}
