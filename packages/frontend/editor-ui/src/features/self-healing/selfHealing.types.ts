import type {
	WorkflowReviewActivityEntry,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';

export type SelfHealingAutonomy = 'diagnose' | 'review' | 'deploy';

export type SelfHealingConfigStatus = 'active' | 'paused';

/**
 * One self-healing configuration. It lives at project level: every workflow
 * in the project is enrolled unless it is listed in `excludedWorkflowIds`.
 */
export interface SelfHealingConfig {
	id: string;
	projectId: string;
	autonomy: SelfHealingAutonomy;
	excludedWorkflowIds: string[];
	customInstructions: string;
	/** Users who review each fix and are notified when the assistant submits one. */
	reviewerIds: string[];
	status: SelfHealingConfigStatus;
	createdAt: string;
	updatedAt: string;
}

export type SelfHealingConfigInput = Omit<
	SelfHealingConfig,
	'id' | 'projectId' | 'createdAt' | 'updatedAt'
>;

/** What the workflow list badge and the workflow settings row show for one workflow. */
export type WorkflowHealingStatus =
	| { enrolled: false; config: SelfHealingConfig | null }
	| { enrolled: true; config: SelfHealingConfig; state: 'monitoring' }
	| { enrolled: true; config: SelfHealingConfig; state: 'fixing'; executionId: string }
	| { enrolled: true; config: SelfHealingConfig; state: 'diagnosed'; diagnosedAt: string }
	| {
			enrolled: true;
			config: SelfHealingConfig;
			state: 'in_review';
			reviewId: string;
			since: string;
	  }
	| {
			enrolled: true;
			config: SelfHealingConfig;
			state: 'healed';
			healedAt: string;
			reviewId: string | null;
	  };

/** Progress of one fix the user started from a failed execution. */
export type SelfHealingFixJob =
	| { status: 'running'; executionId: string; workflowId: string; startedAt: string }
	| {
			status: 'diagnosed';
			executionId: string;
			workflowId: string;
			summary: string;
			suggestedFix: string;
	  }
	| {
			status: 'submitted';
			executionId: string;
			workflowId: string;
			reviewId: string;
			changedNode: string;
	  };

/**
 * A review the assistant authored. Bundles what the review inbox needs with
 * what the inbox item cannot carry: the one-line summary and the feed.
 */
export interface SelfHealingReview {
	item: WorkflowReviewInboxItem;
	detail: WorkflowReviewRequestDetail;
	activity: WorkflowReviewActivityEntry[];
	/** "What failed → what changed", shown under the title in the inbox. */
	summary: string;
	/** Name of the node the fix touched. */
	changedNode: string;
	/** Execution that triggered the fix; `null` for seeded fixtures. */
	executionId: string | null;
}
