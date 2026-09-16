import type {
	WorkflowReviewActivityEntry,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';

export type SelfHealingAutonomy = 'review' | 'deploy';

export type SelfHealingConfigStatus = 'active' | 'paused';

export interface SelfHealingNotificationSettings {
	/** Email project members when the assistant submits a fix for review. */
	emailOnReview: boolean;
	/** Email project members when a fix is deployed without a review. */
	emailOnDeploy: boolean;
	/** Slack channel to post to; `null` means Slack notifications are off. */
	slackChannel: string | null;
}

/**
 * One self-healing configuration. It lives at project level: every workflow
 * in the project is enrolled unless it is listed in `excludedWorkflowIds`.
 */
export interface SelfHealingConfig {
	id: string;
	projectId: string;
	name: string;
	autonomy: SelfHealingAutonomy;
	excludedWorkflowIds: string[];
	customInstructions: string;
	notifications: SelfHealingNotificationSettings;
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
