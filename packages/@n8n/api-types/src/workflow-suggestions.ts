import type { IConnections, INode, WorkflowSnapshot } from 'n8n-workflow';

export type WorkflowSuggestionGraph = { nodes: INode[]; connections: IConnections };
export type WorkflowSuggestionSnapshot = WorkflowSnapshot &
	WorkflowSuggestionGraph & { name: string };

export type WorkflowSuggestionBaseline = {
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	expectedBaseline: {
		savedVersionId: string;
		publishedVersionId: string;
		checksum: string;
		versionCounter: number;
		savedAt: string;
		latestPublishHistoryEventId: number | null;
	};
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
	action: 'submitted' | 'applied' | 'discarded' | 'outdated';
	author: 'assistant' | 'human' | 'system';
	actorId: string | null;
	createdAt: string;
};

export type WorkflowSuggestionAction = 'approve-and-publish' | 'open-in-editor' | 'discard';

export type WorkflowSuggestionAppliedVersion = {
	versionId: string;
	checksum: string;
	action: 'approve-and-publish' | 'open-in-editor';
	actorId: string;
};

export type WorkflowSuggestionProposalDetail = {
	suggestionId: string;
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	expectedBaseline: WorkflowSuggestionBaseline['expectedBaseline'];
	state: 'pending' | 'closed';
	closedReason: 'outdated' | 'applied' | 'discarded' | null;
	resultKind: 'fix_ready' | 'needs_you';
	appliedVersion: WorkflowSuggestionAppliedVersion | null;
	author: 'assistant';
	payload: WorkflowSuggestionContent & { proposed: WorkflowSuggestionSnapshot };
	activity: WorkflowSuggestionActivity[];
};

export type WorkflowSuggestionActionResult = WorkflowSuggestionProposalDetail & {
	/** A publish request error does not establish whether the version is live. */
	publishError?: string;
};
