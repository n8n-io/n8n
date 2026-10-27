import type { SerializedCredential, SerializedCredentialData } from '@n8n/api-types';

import type {
	ImportBindingMap,
	CredentialConflictPolicy,
	CredentialPersonalRoute,
	CredentialMatchingMode,
	CredentialMissingMode,
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
}

export interface CredentialImportPlan extends CredentialResolution {
	stubIds: ImportBindingMap;
	/** Matched credentials the conflict policy can update. Empty under `keep-existing`. */
	candidates: CredentialUpdateCandidate[];
	/** The candidates that `overwrite` would change. */
	updates: CredentialUpdateCandidate[];
	/** Matches in the update scope that the user cannot update. Empty under `keep-existing`. */
	forbidden: CredentialMatch[];
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
}

export interface CredentialApplyResult extends CredentialBindResult {
	/** Source ids whose destination credential this scope wrote under `overwrite`. */
	updated: string[];
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
