import type { IConnections, INode, WorkflowSnapshot } from 'n8n-workflow';

export type WorkflowDraftGraph = { nodes: INode[]; connections: IConnections };
export type WorkflowDraftSnapshot = WorkflowSnapshot & WorkflowDraftGraph & { name: string };

export type WorkflowDraftSource = {
	sourceKey: string;
	workflowId: string;
	backgroundUserId: string;
	expectedBaseline: { savedVersionId: string; publishedVersionId: string; checksum: string };
};

export type WorkflowDraftValidation = {
	revision: number;
	requiredChecks: 'passed';
	configuration: { status: 'not_run' };
	execution: { status: 'not_run' };
};

export type WorkflowDraftContent = {
	original: WorkflowDraftSnapshot;
	candidate: WorkflowDraftGraph;
	explanation: string;
	validation: WorkflowDraftValidation | null;
	errorContext: { summary: string; evidenceReference: string | null } | null;
};

export type WorkflowDraftLifecycleResult = {
	source: WorkflowDraftSource;
	draftId: string;
	state: 'preparing' | 'pending' | 'closed';
	submittedRevision: number | null;
	closedReason: 'outdated' | 'abandoned' | 'applied' | 'discarded' | null;
	content: 'available' | 'expired';
};

export type WorkflowDraftActivity = {
	id: string;
	action: 'submitted';
	author: 'assistant';
	revision: number;
	createdAt: string;
};

export type WorkflowDraftProposalDetail = WorkflowDraftLifecycleResult & {
	projectId: string;
	revision: number;
	author: 'assistant';
	payload: (WorkflowDraftContent & { proposed: WorkflowDraftSnapshot }) | null;
	activity: WorkflowDraftActivity[];
};
