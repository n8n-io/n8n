import type { SerializedCredential, SerializedCredentialData } from '@n8n/api-types';

import type {
	ImportBindingMap,
	CredentialConflictPolicy,
	CredentialOwnerPolicy,
	CredentialPersonalRoute,
	CredentialMatchingMode,
	CredentialMissingMode,
	ImportedCredentialGrant,
	ImportedCredentialMove,
	ImportedCredentialPlaceholder,
} from '../../n8n-packages.types';
import type {
	PackageCredentialRequirement,
	PackageRequirementConsumer,
} from '../../spec/requirements.schema';
import type { AgentRequirementSource } from '../requirement-source';

/** A requirement enriched with the expression data the package bundles for it, when any. */
export type PlacedCredentialRequirement = PackageCredentialRequirement & {
	packageData?: SerializedCredentialData;
	packageDataIsComplete?: boolean;
	/** Package description. `null` clears it. Absent when the source did not export descriptions. */
	packageDescription?: string | null;
};

export interface CredentialReference {
	credentialId: string;
	credentialName?: string;
	credentialType?: string;
}

export interface WorkflowCredentialRequirement extends Required<CredentialReference> {
	workflowId: string;
}

export type CredentialRequirement =
	| WorkflowCredentialRequirement
	| (AgentRequirementSource & CredentialReference);

export type CredentialResolutionFailureKind =
	| 'not_found'
	| 'unknown_type'
	| 'source_not_found'
	| 'type_mismatch';

/**
 * Why the user cannot use a credential that a reference names by id, for `not_found`.
 * Set only for a user who can read all credentials.
 * - `not-on-instance`: no credential has the id.
 * - `access-required`: the credential exists, but it is not shared with the target project.
 * - `incompatible-usage-scope`: the credential exists, but it is not a project credential.
 */
export type CredentialNotFoundReason =
	| 'not-on-instance'
	| 'access-required'
	| 'incompatible-usage-scope';

export type CredentialResolutionFailure = {
	kind: CredentialResolutionFailureKind;
	/** For `not_found` of a credential the matcher looked up by id. */
	reason?: CredentialNotFoundReason;
	sourceId: string;
	name?: string;
	type?: string;
	targetId?: string;
	/** For `type_mismatch`: the credential type the package's workflow node requires. */
	expectedType?: string;
	/** For `type_mismatch`: the actual type of the resolved target credential. */
	actualType?: string;
};

export interface CredentialResolution {
	successes: ImportBindingMap;
	failures: CredentialResolutionFailure[];
}

/** A package credential and the destination credential it resolves to. */
export interface CredentialMatch {
	sourceId: string;
	targetId: string;
	/** Destination credential name, for reporting. */
	targetName: string;
	usedBy: PackageRequirementConsumer[];
}

/**
 * A matched destination credential that the conflict policy can update, with the package
 * payload for it. Holds no stored values: the write decrypts and merges again.
 */
export interface CredentialUpdateCandidate extends CredentialMatch {
	/** Stored type of the destination credential. An update never changes it. */
	targetType: string;
	/** Project on the `credential:owner` sharing of the destination credential. */
	ownerProjectId: string;
	/** Package credential name. */
	name: string;
	/** Package expression values. Absent when the package was exported without values. */
	data?: SerializedCredentialData;
	/** Package description. `null` clears it. Absent means the package does not decide it. */
	description?: string | null;
}

export interface CredentialImportPlan extends CredentialResolution, CredentialDependencyPlan {
	stubIds: ImportBindingMap;
	/** Matched credentials the conflict policy can update. Empty under `keep-existing`. */
	candidates: CredentialUpdateCandidate[];
	/** The candidates that `overwrite` would change. */
	updates: CredentialUpdateCandidate[];
	/** Matches in the update scope that the user cannot update. Empty under `keep-existing`. */
	forbidden: CredentialMatch[];
}

/** An empty placeholder that one scope of the import creates for a missing credential. */
export interface PlannedCredentialPlaceholder {
	sourceId: string;
	name: string;
	type: string;
	/** The other projects of the import that use the credential. They get use access. */
	shareWithProjectIds: string[];
}

/**
 * A package credential whose owner on the destination differs from its home project in the
 * package. An owner mismatch alone is a change of the credential, also when its name and
 * values are equal: a preview reads this list for its change rows.
 */
export interface PlannedCredentialMove {
	credentialId: string;
	/** Destination credential name. */
	name: string;
	type: string;
	/** The project that the package names as the owner. */
	toProjectId: string;
	/** The owner on the destination. The caller decides who may see it. */
	fromProjectId?: string;
	isPlaceholder: boolean;
	/**
	 * - `allowed`: the import moves the credential, then updates it.
	 * - `not-allowed`: the user may not move it. The import does not move and does not update it.
	 * - `excluded`: this kind of credential never moves. The import does not update it.
	 */
	status: 'allowed' | 'not-allowed' | 'excluded';
	/** For `excluded`. */
	reason?: 'managed' | 'resolvable' | 'instance';
}

/**
 * What the plan decided for the references that `credentialDependencies` names. A reference in
 * one of these lists is not in `failures` and does not block. All lists are absent or empty
 * without `credentialDependencies`, except `matchedPlaceholders`.
 */
export interface CredentialDependencyPlan {
	/** Placeholders that this scope creates. */
	placeholders?: PlannedCredentialPlaceholder[];
	/** Source ids that bind to a placeholder that an earlier scope of the same import creates. */
	placeholderBindings?: string[];
	/**
	 * Source ids named for a placeholder that the user may not create. They are back in
	 * `failures` as `not_found`, so they block.
	 */
	placeholderForbidden?: string[];
	/** Source ids that the project can use after the confirmed grant, which `apply` gives. */
	pendingGrants?: string[];
	/** Source ids that the project can use after the planned move, which makes it the owner. */
	pendingMoves?: string[];
	/** Source ids whose reference stays unchanged: the consumer project cannot use the credential. */
	unresolvedAllowed?: string[];
	/** Source ids matched to a destination credential that is a placeholder. They block publishing. */
	matchedPlaceholders?: string[];
	/** Owner changes for the package credentials that this scope owns. */
	moves?: PlannedCredentialMove[];
}

/**
 * - `differs`: under `fail`, the package would change the destination credential.
 * - `divergent`: under `overwrite`, two or more package credentials with different
 *   payloads resolve to one destination credential.
 */
export interface CredentialConflict {
	kind: 'differs' | 'divergent';
	targetId: string;
	sourceIds: string[];
	/** Destination credential name. */
	name: string;
	usedBy: PackageRequirementConsumer[];
}

/**
 * A destination credential in the update scope that the importing user cannot update.
 * Blocks under `overwrite` and `fail`, also when it would not change: its stored values are
 * never read.
 */
export type CredentialUpdateForbidden = Omit<CredentialConflict, 'kind'>;

/** Which matched destination credentials the conflict policy can update. */
export interface CredentialUpdateScope {
	/** Destination projects of the import. A credential owned by one of them is in scope. */
	projectIds: ReadonlySet<string>;
}

/** What binding wrote: the source → target map, and the credentials created for missing ones. */
export interface CredentialBindResult {
	bindings: ImportBindingMap;
	matched: string[];
	stubbed: string[];
	seeded: string[];
	incomplete: string[];
	/** Placeholders that this scope created. */
	placeholders?: ImportedCredentialPlaceholder[];
	/** Source ids that bind to a placeholder: created by this import, or matched on the destination. */
	placeholderBound?: string[];
	/** Use access that this scope gave, or found in place. */
	grants?: ImportedCredentialGrant[];
	/** Source ids whose reference this scope wrote unchanged. */
	unresolved?: string[];
	/** Owner changes of this scope, moved or not. */
	moves?: ImportedCredentialMove[];
}

export interface CredentialApplyResult extends CredentialBindResult {
	/** Source ids whose destination credential this scope wrote under `overwrite`. */
	updated: string[];
}

/**
 * The decisions of the caller for one scope, from `credentialDependencies` of the import
 * request. The sets hold credential ids of the package.
 */
export interface CredentialDependencyRequest {
	placeholderIds: ReadonlySet<string>;
	allowedUnresolvedIds: ReadonlySet<string>;
	/** Credentials with a confirmed grant for the project of this scope. */
	grantIds: ReadonlySet<string>;
	ownerPolicy: CredentialOwnerPolicy;
	/**
	 * Home project of each package credential: the project folder that holds its file, or the
	 * explicit home of a file at the top level. A credential without a home follows the rule of
	 * `isUpdateCandidate`.
	 */
	homes: ReadonlyMap<string, string>;
	/** Package credentials whose home is the project of this scope and that this import writes. */
	ownedIds: ReadonlySet<string>;
	/** The import creates the project of this scope, so it has no scopes to look up yet. */
	projectPendingCreation: boolean;
}

export interface CredentialBindingRequest {
	requirements: PlacedCredentialRequirement[] | undefined;
	matchingMode: CredentialMatchingMode;
	missingMode: CredentialMissingMode;
	credentialBindings?: ImportBindingMap;
	conflictPolicy: CredentialConflictPolicy;
	/** Omitted means `allow`. */
	personalRoute?: CredentialPersonalRoute;
	/** Package credential files by credential id. Read only when the policy is not `keep-existing`. */
	packageCredentials?: ReadonlyMap<string, SerializedCredential>;
	updateScope: CredentialUpdateScope;
	/** Promotion-only. Omitted means that every reference follows the modes above. */
	dependencies?: CredentialDependencyRequest;
}

export function createFailure(
	reference: PackageCredentialRequirement,
	kind: CredentialResolutionFailureKind,
): CredentialResolutionFailure {
	return {
		kind,
		sourceId: reference.id,
		name: reference.name,
		type: reference.type,
	};
}
