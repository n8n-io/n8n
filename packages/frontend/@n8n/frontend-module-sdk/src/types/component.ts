import type { WorkflowReviewVersionSnapshot } from '@n8n/api-types';

/**
 * UI a module renders but does not own.
 *
 * Each id names one shell-hosted component with a fixed contract. The union is
 * closed on purpose: this is not a generic slot system, and adding an id is a
 * reviewed change to the module contract, not a local decision.
 *
 * `project-filter` — a project picker. The project list, the permissions that
 * decide between local and remote search, and the search itself all live in
 * `features/collaboration/projects`, which sits above the module layer. A module
 * that needs to filter by project renders this instead of importing any of it.
 * `workflow-diff` renders plain workflow snapshots with the editor canvas.
 * `promotion-changes` lists what a promotion review changes. It loads the changes itself, so
 * the module needs no knowledge of the promotion types.
 */
export type ModuleComponentSlot = 'project-filter' | 'workflow-diff' | 'promotion-changes';

/**
 * The `v-model` value of the `project-filter` slot. `null` means "all projects".
 *
 * Deliberately narrow: `id` is all a consumer needs, and the host keeps the full
 * project object. A consumer writes only `null` (to clear); every non-null value
 * originates in the host.
 */
export type SlotProjectSelection = { id: string } | null;

/** Plain snapshots keep the editor canvas types inside the shell. */
export type SlotWorkflowDiffSnapshot = Pick<
	WorkflowReviewVersionSnapshot,
	'nodes' | 'connections'
> &
	Partial<Pick<WorkflowReviewVersionSnapshot, 'versionId' | 'createdAt' | 'nodeGroups'>>;

export type SlotWorkflowDiffProps = {
	workflowId: string;
	workflowName: string;
	sourceSnapshot?: SlotWorkflowDiffSnapshot;
	targetSnapshot?: SlotWorkflowDiffSnapshot;
	sourceLabel?: string;
	targetLabel?: string;
	showFullscreenButton?: boolean;
	canvasIdPrefix?: string;
	hideTitle?: boolean;
};

export type SlotPromotionChangesProps = {
	reviewId: string;
};

/**
 * What the `promotion-changes` slot shows, emitted as `state`. Approve sends the head commit of
 * the changes that the reviewer saw, so it waits for `ready`.
 */
export type PromotionChangesState =
	| { status: 'loading' }
	| { status: 'ready'; headCommitSha: string }
	| { status: 'unavailable' };
