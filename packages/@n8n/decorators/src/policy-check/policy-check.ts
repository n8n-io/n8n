import type { PolicyCheckFailure, PolicyViolation } from '@n8n/api-types';
import type { Constructable } from '@n8n/di';
import type { INode } from 'n8n-workflow';

export type { PolicyViolation, PolicyCheckFailure };

/**
 * The points in n8n where a policy can block an action.
 *
 * Adding a point here leaves existing checks untouched. Removing one isn't silent either:
 * the registry rejects `on*` methods that aren't in this list, so a check can't keep
 * pointing at a point that no longer exists.
 */
export const ENFORCEMENT_POINTS = [
	'workflowSave',
	'workflowPublish',
	'workflowStart',
	'workflowTransfer',
	'credentialDecrypt',
	'contentImport',
] as const;

export type EnforcementPoint = (typeof ENFORCEMENT_POINTS)[number];

/**
 * The workflow as a policy check sees it.
 *
 * Narrower than `IWorkflowBase` on purpose: a check only needs the nodes, and passing the
 * whole entity invites checks to start depending on unrelated fields. `readonly` because
 * checks only read — they never change anything.
 *
 * An `IWorkflowBase` fits this shape, so hosts can pass their entity straight through.
 */
export type PolicedWorkflow = {
	/** `null` for a new workflow — it has no id until it's saved. */
	readonly id: string | null;
	readonly name: string;
	readonly nodes: readonly INode[];
};

/**
 * The node asking to decrypt a credential.
 *
 * Credentials are locked based on the node asking, not the credential type — the same
 * credential can be fine for one node and blocked for another.
 */
export type CredentialConsumer = {
	/** Full node type name, e.g. `n8n-nodes-base.slack`. */
	readonly nodeType: string;
};

export type WorkflowSaveContext = {
	readonly workflow: PolicedWorkflow;
	/**
	 * The saved workflow this save replaces, or `null` for a new one.
	 *
	 * Nullable rather than optional so it can't be left out by accident. The host must load
	 * it from the database — never take it from the request, or a caller could fake an old
	 * version to slip content past the check.
	 */
	readonly storedWorkflow: PolicedWorkflow | null;
	readonly projectId: string | null;
};

export type WorkflowPublishContext = {
	readonly workflow: PolicedWorkflow;
	readonly projectId: string | null;
};

export type WorkflowStartContext = {
	readonly workflow: PolicedWorkflow;
	readonly projectId: string | null;
};

export type WorkflowTransferContext = {
	readonly workflow: PolicedWorkflow;
	/** The project the workflow is moving *into* — that's whose policy applies. */
	readonly targetProjectId: string | null;
};

export type CredentialDecryptContext = {
	readonly credentialType: string;
	readonly credentialId: string;
	/** `null` when no node is asking, e.g. a credential test. */
	readonly consumer: CredentialConsumer | null;
	readonly projectId: string | null;
};

/**
 * How the content reached the instance.
 *
 * A check needs this to hold an unattended sync to a different standard than a hand-run
 * import, and the host reads it to pick its fail posture — a batch sync reports, a direct
 * import refuses before writing.
 */
export type ContentImportTransport = 'cli' | 'source-control' | 'package' | 'git-connection';

export type ContentImportContext = {
	readonly workflow: PolicedWorkflow;
	readonly projectId: string | null;
	readonly transport: ContentImportTransport;
};

/** A policy version a check read, recorded on the audit log. */
export type PolicyVersionRef = {
	/** Usually `'instance'` or `'project'`. Open, like {@link PolicyViolation.scope}. */
	scope: string;
	version: number;
};

/**
 * What one check returns.
 *
 * Everything in `violations` blocks. If we ever want warnings that don't block, they get
 * their own field here rather than a severity flag on the violation — a flag would quietly
 * change what every existing check means.
 */
export type PolicyCheckResult = {
	violations: PolicyViolation[];

	/** The policies this check read, for the audit log. */
	policyVersions?: PolicyVersionRef[];
};

/**
 * The combined result of every check at one point.
 *
 * Almost the same as {@link PolicyCheckResult} today, but kept separate so it's always
 * clear who filled a field in: a single check, or the layer combining them.
 */
export type PolicyDecision = {
	violations: PolicyViolation[];

	policyVersions?: PolicyVersionRef[];

	/**
	 * `evaluate` only. A check that failed lands here while the rest keep their results, so
	 * one broken check doesn't sink a whole report — and a crash never looks like "nothing
	 * to report".
	 */
	checkErrors?: PolicyCheckFailure[];
};

/**
 * What every policy check implements.
 *
 * One method per point, each with its own context type: mistakes are caught when compiling,
 * and giving a check more context takes a visible signature change rather than happening
 * by accident.
 *
 * Rules for writing one:
 * - Report violations, don't throw for them. A throw means something broke, and blocks the
 *   action.
 * - Only read state, never write it. That's what makes `evaluate` safe to call.
 * - Implement only the points you care about.
 * - Pass `signal` to anything that accepts one, and check it around long steps. Every check
 *   runs under a deadline; the signal is how a check gets to stop its own work instead of
 *   being abandoned mid-query. Ignoring it is safe — the deadline still holds — but the work
 *   carries on in the background.
 *
 * There's no `priority`, because every check has to pass — the order they run in can't
 * change the answer.
 *
 * @example
 * ```typescript
 * @PolicyCheck()
 * export class NodeTypePolicyCheck implements RegisteredPolicyCheck {
 *   readonly id = 'node-type-availability';
 *
 *   async onWorkflowStart({ workflow, projectId }: WorkflowStartContext, signal: AbortSignal) {
 *     return { violations: await this.violationsFor(workflow, projectId, signal) };
 *   }
 * }
 * ```
 */
export interface RegisteredPolicyCheck {
	/** Stable id, shown on every violation and on the audit log. */
	id: string;

	onWorkflowSave?(ctx: WorkflowSaveContext, signal: AbortSignal): Promise<PolicyCheckResult>;
	onWorkflowPublish?(ctx: WorkflowPublishContext, signal: AbortSignal): Promise<PolicyCheckResult>;
	onWorkflowStart?(ctx: WorkflowStartContext, signal: AbortSignal): Promise<PolicyCheckResult>;
	onWorkflowTransfer?(
		ctx: WorkflowTransferContext,
		signal: AbortSignal,
	): Promise<PolicyCheckResult>;
	onCredentialDecrypt?(
		ctx: CredentialDecryptContext,
		signal: AbortSignal,
	): Promise<PolicyCheckResult>;
	onContentImport?(ctx: ContentImportContext, signal: AbortSignal): Promise<PolicyCheckResult>;
}

/** The {@link RegisteredPolicyCheck} method for a point, e.g. `'onWorkflowSave'`. */
export type PolicyCheckMethod = `on${Capitalize<EnforcementPoint>}`;

/**
 * Which method belongs to which point.
 *
 * The type pins each point to exactly its own method name, so a missing entry, a stray
 * entry, and a point wired to the wrong method all fail to compile. If a method is renamed
 * on the interface without updating this list, {@link pointsImplementedBy} stops compiling.
 */
export const ENFORCEMENT_POINT_METHODS: {
	readonly [P in EnforcementPoint]: `on${Capitalize<P>}`;
} = {
	workflowSave: 'onWorkflowSave',
	workflowPublish: 'onWorkflowPublish',
	workflowStart: 'onWorkflowStart',
	workflowTransfer: 'onWorkflowTransfer',
	credentialDecrypt: 'onCredentialDecrypt',
	contentImport: 'onContentImport',
};

/** Constructor of a class implementing {@link RegisteredPolicyCheck}, for DI. */
export type PolicyCheckClass = Constructable<RegisteredPolicyCheck>;

/**
 * Which points a check actually implements.
 *
 * Kept next to the mapping above so callers don't each work it out themselves.
 */
export const pointsImplementedBy = (check: RegisteredPolicyCheck): EnforcementPoint[] =>
	ENFORCEMENT_POINTS.filter(
		(point) => typeof check[ENFORCEMENT_POINT_METHODS[point]] === 'function',
	);
