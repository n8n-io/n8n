import type { IConnections, INode, WorkflowSnapshot } from 'n8n-workflow';

export type WorkflowSuggestionGraph = { nodes: INode[]; connections: IConnections };
export type WorkflowSuggestionSnapshot = WorkflowSnapshot &
	WorkflowSuggestionGraph & { name: string };

export type WorkflowSuggestionSource = {
	sourceKey: string;
	workflowId: string;
	backgroundUserId: string;
	expectedBaseline: { savedVersionId: string; publishedVersionId: string; checksum: string };
};

export type WorkflowSuggestionValidation = {
	revision: number;
	requiredChecks: 'passed';
	configuration: { status: 'not_run' };
	execution: { status: 'not_run' };
};

export type WorkflowSuggestionContent = {
	original: WorkflowSuggestionSnapshot;
	candidate: WorkflowSuggestionGraph;
	explanation: string;
	validation: WorkflowSuggestionValidation | null;
	errorContext: { summary: string; evidenceReference: string | null } | null;
};

export type WorkflowSuggestionLifecycleResult = {
	source: WorkflowSuggestionSource;
	suggestionId: string;
	state: 'preparing' | 'pending' | 'closed';
	submittedRevision: number | null;
	closedReason: 'outdated' | 'abandoned' | 'applied' | 'discarded' | null;
	content: 'available' | 'expired';
};

export type WorkflowSuggestionActivity = {
	id: string;
	action: 'submitted';
	author: 'assistant';
	revision: number;
	createdAt: string;
};

export type WorkflowSuggestionProposalDetail = WorkflowSuggestionLifecycleResult & {
	projectId: string;
	revision: number;
	author: 'assistant';
	payload: (WorkflowSuggestionContent & { proposed: WorkflowSuggestionSnapshot }) | null;
	activity: WorkflowSuggestionActivity[];
};
