import type { IConnections, INode, WorkflowSnapshot } from 'n8n-workflow';

export type WorkflowSuggestionGraph = { nodes: INode[]; connections: IConnections };
export type WorkflowSuggestionSnapshot = WorkflowSnapshot &
	WorkflowSuggestionGraph & { name: string };

export type WorkflowSuggestionBaseline = {
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	expectedBaseline: { savedVersionId: string; publishedVersionId: string; checksum: string };
	original: WorkflowSuggestionSnapshot;
};

export type WorkflowSuggestionContent = {
	original: WorkflowSuggestionSnapshot;
	candidate: WorkflowSuggestionGraph;
	explanation: string;
	errorContext: { summary: string; evidenceReference: string | null } | null;
};

export type WorkflowSuggestionActivity = {
	id: string;
	action: 'submitted' | 'applied' | 'discarded' | 'outdated' | 'published' | 'publish_failed';
	author: 'assistant' | 'human' | 'system';
	createdAt: string;
};

export type WorkflowSuggestionProposalDetail = {
	suggestionId: string;
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	expectedBaseline: WorkflowSuggestionBaseline['expectedBaseline'];
	state: 'pending' | 'closed';
	closedReason: 'outdated' | 'applied' | 'discarded' | null;
	author: 'assistant';
	payload: WorkflowSuggestionContent & { proposed: WorkflowSuggestionSnapshot };
	activity: WorkflowSuggestionActivity[];
};
