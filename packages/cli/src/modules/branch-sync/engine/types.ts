/** Parsed content of one package file (a workflow, credential stub, or variable). */
export type ResourceContent = Record<string, unknown>;

/** A package is a map of `path -> resource`, where the path is the stable resource id. */
export type Package = Record<string, ResourceContent>;

export type ChangeStatus = 'A' | 'M' | 'D';
export type SideStatus = ChangeStatus | 'U';

export type ScopeRole = 'source' | 'destination';
export type ConflictPolicy = 'manual' | 'mirror' | 'keep-live';

export type ConflictReason =
	| 'both-modified'
	| 'git-modified-live-deleted'
	| 'git-deleted-live-modified'
	| 'both-added-diverged';

export type DecisionKind =
	| 'converged'
	| 'apply-to-live'
	| 'outgoing'
	| 'keep-live-override'
	| 'reset-to-head'
	| 'conflict'
	| 'deferred'
	| 'skipped';

export interface Decision {
	path: string;
	/** Status of the git side (`head` vs `base`). */
	g: SideStatus;
	/** Status of the live side (`live` vs `base`). */
	l: SideStatus;
	kind: DecisionKind;
	op?: 'create' | 'update' | 'modify' | 'delete';
	reason?: ConflictReason;
	/** For conflicts: 'head' | 'live' when resolved, false when blocking. */
	resolved?: 'head' | 'live' | false;
	note?: string;
}

export interface ReconcileOptions {
	role: ScopeRole;
	editable?: boolean;
	policy?: ConflictPolicy;
	/** Explicit per-path conflict resolutions; beats the policy. */
	choices?: Record<string, 'head' | 'live'>;
	/** Partial apply (D009): only these paths are acted on; base must not advance. */
	select?: string[];
	/** Precomputed `git diff --name-status base..head` (path -> status). */
	gitDiff?: Map<string, ChangeStatus>;
	/** Precomputed `git diff --name-status base..live` over the serialized live package. */
	liveDiff?: Map<string, ChangeStatus>;
	/** D007: paths for which an incoming deletion is never auto-applied (credentials). */
	isDeletionExempt?: (path: string) => boolean;
}

export interface ReconcileResult {
	decisions: Decision[];
	/** Live package after applying the plan's inward decisions. */
	resultingLive: Package;
	/** Head package after applying the plan's outgoing decisions (source only). */
	resultingHead: Package;
	/** Unresolved conflicts — these block base advancement (and any push). */
	blocked: Decision[];
	outgoing: Decision[];
	deferred: Decision[];
	pushBlocked: boolean;
	/** True when the reconcile fully landed: no unresolved conflicts, no active selection. */
	baseAdvances: boolean;
}
