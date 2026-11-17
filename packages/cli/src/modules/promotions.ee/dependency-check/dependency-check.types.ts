import type { PromotionDependencyReport, PromotionReferenceUsage } from '@n8n/api-types';

/*
 * The facts that the pure check reads. A fact gatherer builds them from the database and the
 * branch. The check itself reads nothing else, so the preview and the operation give the same
 * report for the same facts.
 *
 * A fact can describe a resource that the user cannot access. The check needs it to tell a gap
 * from a broken reference. Only the check decides what goes into the report.
 */

/** A fact that the gatherer could not resolve is `'unknown'`. Unknown is never "broken". */
export type Verdict = boolean | 'unknown';

export type TargetKind = 'credential' | 'workflow';

export type FactProject = { id: string; name: string; kind: 'team' | 'personal' };

/** The item of the operation that holds the reference. */
export type ReferenceConsumer = {
	id: string;
	name: string;
	/** The project of the consumer after the operation. */
	projectId: string;
};

/** One static reference of an item that the operation writes. */
export type ReferenceFact = {
	consumer: ReferenceConsumer;
	target: {
		kind: TargetKind;
		id: string;
		/** The name and the type as the node of the consumer holds them. */
		name?: string;
		credentialType?: string;
	};
	usage: PromotionReferenceUsage;
	/**
	 * Apply only: the incoming version does not hold the reference, and the published version on
	 * the destination does. The deletion check and the grant check of a move read it.
	 */
	publishedOnly?: boolean;
};

/** A reference that an expression computes. It has no static target, so it is a note only. */
export type ExpressionReferenceFact = {
	consumer: ReferenceConsumer;
	usage: PromotionReferenceUsage;
};

/** `credential:<id>` or `workflow:<id>`. The same shape as a resource key of the previews. */
export type TargetKey = `${TargetKind}:${string}`;

export const targetKey = (kind: TargetKind, id: string): TargetKey => `${kind}:${id}`;

/** A target as the source instance holds it (Promote). */
export type SourceTargetFact = {
	exists: Verdict;
	name?: string;
	credentialType?: string;
	archived?: boolean;
	/** The project that owns the target. */
	project?: FactProject;
	usageScope?: 'project' | 'instance';
	isPlaceholder?: boolean;
	/** Whether the user can read the target itself. */
	canRead: boolean;
	/**
	 * Whether each consumer can use the target, by consumer workflow id. For a credential: the
	 * project of the consumer can use it. For a workflow: the caller policy allows the consumer.
	 * A consumer that is not in the record is unknown.
	 */
	usableBy: Record<string, Verdict>;
};

export type RequirementReasonFact = 'confirmed-gap' | 'broken-on-source' | 'instance-credential';

/** What the branch holds before the operation. */
export type BranchFact = {
	/** The project folders that hold a file of each credential. A top-level file is not here. */
	credentialFolders: Record<string, string[]>;
	/** The name and the type of each credential file, also of a top-level file. */
	credentials: Record<string, { name: string; type: string }>;
	/** The credentials with a file at the top level only. They have no owner. */
	topLevelCredentialIds: string[];
	workflows: Record<string, { projectId: string; name: string }>;
	/** The requirement rows of targets that the branch does not hold. */
	requirements: Partial<
		Record<TargetKey, { reason?: RequirementReasonFact; name?: string; credentialType?: string }>
	>;
	/** The projects of the branch, for the names of projects that the destination lacks. */
	projects: Record<string, { name: string }>;
};

/** What the operation writes and deletes. */
export type PlanFact = {
	/** The project that each written workflow is in after the operation. */
	writtenWorkflows: Record<string, string>;
	/** The project that each written credential is in after the operation. */
	writtenCredentials: Record<string, string>;
	/** The workflows that the selection deletes. */
	deletedWorkflows: Array<{ id: string; name: string; projectId: string }>;
	/**
	 * Instance Apply only: the destination workflows that the package lacks. The Apply deletes
	 * them, except the ones that a workflow of the package still references.
	 */
	reconcileDeletedWorkflows?: Array<{ id: string; name: string; projectId: string }>;
	/** Instance Apply only: the destination projects that the Apply deletes. */
	deletedProjectIds?: string[];
	/** The projects of the operation, in the order of the changes view. */
	projectOrder: string[];
};

/** What the user can do. Every list holds project ids. */
export type AccessFact = {
	readableProjectIds: string[];
	/** The projects that the user can promote (Promote) or apply (Apply). */
	operableProjectIds: string[];
	/** The projects that the environment covers. */
	coveredProjectIds: string[];
	/** The name and the kind of each project that a fact names. */
	projects: Record<string, FactProject>;
	/** Apply: the rights of the user on a destination credential. A missing right is false. */
	credentials: Record<string, { canShare?: boolean; canMove?: boolean }>;
	/** Apply: the projects where the user can create a credential. */
	createCredentialProjectIds: string[];
	/** Apply: false when the instance has no sharing licence. */
	sharingLicensed?: boolean;
	/** Whether the user can open a promotion review. */
	canReadReviews: boolean;
};

/** An open review of the promote environment, with the targets that it adds to the branch. */
export type OpenReviewFact = { reviewId: string; webUrl?: string; targetKeys: TargetKey[] };

/** A target as the destination instance holds it now (Apply). */
export type DestinationTargetFact = {
	name?: string;
	credentialType?: string;
	archived?: boolean;
	project?: FactProject;
	usageScope?: 'project' | 'instance';
	isPlaceholder?: boolean;
	isManaged?: boolean;
	isResolvable?: boolean;
	/** Whether the user can read the target itself. */
	canRead: boolean;
	/** Credential: every project can use it (a global credential). */
	usableByAllProjects?: boolean;
	/** Credential: the projects that can use it now. The owner is one of them. */
	usableByProjectIds?: string[];
};

/** A destination workflow that this Apply does not write and that calls a deleted workflow. */
export type DestinationCallerFact = {
	targetId: string;
	caller: { id: string; name: string; projectId: string };
};

export type PromoteCheckInput = {
	allowIncomplete: boolean;
	references: ReferenceFact[];
	expressionReferences: ExpressionReferenceFact[];
	/** By target key. A target that is not in the record is unknown, so it counts as working. */
	sourceTargets: Partial<Record<TargetKey, SourceTargetFact>>;
	branch: BranchFact;
	plan: PlanFact;
	access: AccessFact;
	openReviews: OpenReviewFact[];
};

export type ApplyCheckInput = {
	allowIncomplete: boolean;
	references: ReferenceFact[];
	expressionReferences: ExpressionReferenceFact[];
	branch: BranchFact;
	/** By target key. A target that is not in the record is not on the destination. */
	destinationTargets: Partial<Record<TargetKey, DestinationTargetFact>>;
	/**
	 * The caller policy verdict for the state after the Apply, by sub-workflow id and then by
	 * consumer workflow id. A pair that is not in the record is unknown.
	 */
	callerVerdicts: Record<string, Record<string, Verdict>>;
	destinationCallers: DestinationCallerFact[];
	plan: PlanFact;
	access: AccessFact;
	/** The home that the user selected for a credential without an owner, by credential id. */
	credentialHomes?: Record<string, string>;
};

/** A placeholder credential that an incomplete Apply must create. */
export type PlaceholderCandidate = {
	credential: { id: string; name: string; type: string };
	/** The first consumer project in the order of the changes view. */
	projectId: string;
	/** The other consumer projects of the same Apply. The Apply shares the placeholder with them. */
	shareWithProjectIds: string[];
	gapIds: string[];
};

/**
 * What the Apply operation must do because of the check. Unlike the report, it also holds
 * items that the user cannot access. Never send it to a client.
 */
export type ApplyCheckActions = {
	/** Reconciliation must not delete these workflows. */
	keptWorkflowIds: string[];
	/** Reconciliation must not delete these projects: a written workflow uses their credential. */
	keptProjects: Array<{ projectId: string; credentialIds: string[] }>;
	/** Only for an incomplete Apply, after the user confirmed the gaps. */
	placeholders: PlaceholderCandidate[];
};

export type ApplyCheckOutcome = { report: PromotionDependencyReport; actions: ApplyCheckActions };
