import type {
	WorkflowReviewActivityEntry,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';

export type SelfHealingAutonomy = 'diagnose' | 'review' | 'deploy';

export type SelfHealingConfigStatus = 'active' | 'paused';

/** Which of the project's workflows the configuration covers. */
export type SelfHealingScope = 'all' | 'selected';

/**
 * One self-healing configuration. It lives at project level and covers either
 * every workflow in the project or only the selected ones.
 */
export interface SelfHealingConfig {
	id: string;
	projectId: string;
	autonomy: SelfHealingAutonomy;
	scope: SelfHealingScope;
	/** Only read when `scope` is `selected`. */
	selectedWorkflowIds: string[];
	customInstructions: string;
	/** Notify every member of the project, on top of `reviewerIds`. */
	notifyProjectMembers: boolean;
	/** Individually picked users who are notified when the assistant submits a fix. */
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
/**
 * What an investigation produced. Every eligible failure ends up in the inbox
 * as one of these, so the feature leaves a trace even when nothing was fixed.
 */
export type SelfHealingInboxKind = 'fix' | 'needs_you' | 'could_not_fix';

export interface SelfHealingOutcome {
	kind: Exclude<SelfHealingInboxKind, 'fix'>;
	/** Where the next step happens. `null` falls back to "Continue in chat". */
	action: { type: 'open_credential'; credentialName: string } | null;
}

/** What an investigation cost. `null` when the pre-check stopped it before any AI ran. */
export interface SelfHealingUsage {
	credits: number;
	turns: number;
	durationSeconds: number;
}

/**
 * One entry in the read-only trace of an investigation. `at` is seconds since
 * the failure. Tool calls keep their input and output so the trace shows what
 * the assistant saw, not only what it concluded.
 */
export type SelfHealingTraceEntry =
	| { type: 'event'; at: number; label: string; error?: string }
	| { type: 'text'; at: number; text: string }
	| {
			type: 'tool';
			at: number;
			tool: string;
			label: string;
			input: Record<string, unknown>;
			output: string;
			error?: string;
	  };

export interface SelfHealingReview {
	kind: SelfHealingInboxKind;
	usage: SelfHealingUsage | null;
	trace: SelfHealingTraceEntry[];
	/** Set for `needs_you` and `could_not_fix`; `null` for a fix review. */
	outcome: SelfHealingOutcome | null;
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
