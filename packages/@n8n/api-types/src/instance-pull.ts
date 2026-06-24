import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

/**
 * A single instance-pull review (one GitHub PR) as surfaced in the role-aware
 * dashboards. `dev` sees these under "My publish requests" and `prd` under
 * "Incoming publish requests".
 */
export type ReviewSummary = {
	pullRequestNumber: number;
	pullRequestUrl: string;
	workflowName: string;
	status: 'pending' | 'blocked' | 'ready' | 'published';
	/** Credentials the prd instance is missing for this PR. Present when `status === 'blocked'`. */
	missingCredentials?: Array<{
		id: string;
		name: string;
		type: string;
		usedByWorkflows: string[];
	}>;
};

/** One side of a publish diff — enough of a workflow for the visual diff view. */
export type WorkflowDiffSide = {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
};

/**
 * The two sides of an instance-pull publish diff: the workflow currently on the
 * target (prd) instance (`source`, `null` if it doesn't exist there yet) vs the
 * incoming version from the PR package (`target`).
 */
export type WorkflowDiffPayload = {
	source: WorkflowDiffSide | null;
	target: WorkflowDiffSide;
};
