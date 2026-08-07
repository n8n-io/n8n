// The branch-sync backend POC has no @n8n/api-types DTOs; these mirror
// packages/cli/src/modules/branch-sync (engine/types.ts + service responses).

export type ScopeRole = 'source' | 'destination';
export type ConflictPolicy = 'manual' | 'mirror' | 'keep-live';
export type SideStatus = 'A' | 'M' | 'D' | 'U';

export type DecisionKind =
	| 'converged'
	| 'apply-to-live'
	| 'outgoing'
	| 'keep-live-override'
	| 'reset-to-head'
	| 'conflict'
	| 'deferred'
	| 'skipped';

export type ConflictReason =
	| 'both-modified'
	| 'git-modified-live-deleted'
	| 'git-deleted-live-modified'
	| 'both-added-diverged';

export type ConflictChoices = Record<string, 'head' | 'live'>;

export interface Decision {
	path: string;
	g: SideStatus;
	l: SideStatus;
	kind: DecisionKind;
	op?: 'create' | 'update' | 'modify' | 'delete';
	reason?: ConflictReason;
	resolved?: 'head' | 'live' | false;
	note?: string;
	/** Display name resolved by the backend (workflow/credential name, variable key). */
	name?: string | null;
}

export interface PackageFileError {
	path: string;
	error: string;
}

export interface ProposalInfo {
	branch: string;
	masterFork: string;
	liveFork: string;
	paths: string[];
}

export interface ScopeState {
	scopeKey: string;
	repoUrl: string;
	branch: string;
	role: ScopeRole;
	editable: boolean;
	policy: ConflictPolicy;
	baseCommit: string;
	proposals: Record<string, ProposalInfo>;
}

export interface ScopeSummary extends ScopeState {
	head: string | null;
	aheadOfBase: number | null;
}

export interface PlanResponse {
	scopeKey: string;
	role: ScopeRole;
	policy: ConflictPolicy;
	editable: boolean;
	base: string;
	head: string | null;
	target: string;
	decisions: Decision[];
	conflicts: Decision[];
	outgoing: Decision[];
	deferred: Decision[];
	pushBlocked: boolean;
	baseAdvances: boolean;
	errors: PackageFileError[];
}

export interface SyncResponse extends PlanResponse {
	newBase: string;
	pushedCommit: string | null;
	applied: string[];
	failed: PackageFileError[];
}

export interface CommitInfo {
	sha: string;
	message: string;
	isBase: boolean;
	isTarget: boolean;
}

export interface ProposalStatus extends ProposalInfo {
	name: string;
	tip: string;
	head?: string | null;
	behindTarget: boolean;
	mergeable: boolean;
}

export interface ProposalActionResponse {
	name: string;
	refreshed?: boolean;
	updated?: boolean;
	tip: string;
	decisions?: Decision[];
	conflicts?: Decision[];
	note?: string;
}

export interface ConnectScopePayload {
	scopeKey?: string;
	repoUrl: string;
	branch: string;
	role: ScopeRole;
	policy?: ConflictPolicy;
	editable?: boolean;
}

export interface SyncPayload {
	choices?: ConflictChoices;
	select?: string[];
	to?: string;
}
