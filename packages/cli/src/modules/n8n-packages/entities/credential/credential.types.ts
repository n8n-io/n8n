import type { Project, User } from '@n8n/db';

import type {
	ImportBindingMap,
	CredentialMatchingMode,
	CredentialMissingMode,
} from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

export interface WorkflowCredentialRequirement {
	workflowId: string;
	credentialId: string;
	credentialName: string;
	credentialType: string;
}

export type CredentialResolutionFailureKind = 'not_found' | 'unknown_type';

export type CredentialResolutionFailure = {
	kind: CredentialResolutionFailureKind;
	sourceId: string;
	usedByWorkflows: string[];
};

export interface CredentialResolution {
	successes: ImportBindingMap;
	failures: CredentialResolutionFailure[];
}

export interface CredentialBindingRequest {
	requirements: PackageCredentialRequirement[] | undefined;
	matchingMode: CredentialMatchingMode;
	missingMode: CredentialMissingMode;
	targetProject: Project;
	user: User;
}

/**
 * Context a missing-mode handler may need to act on unresolved credentials, e.g.
 * `create-stubs` reads `requirements` for credential type/name and owns new stubs in `targetProject`.
 */
export interface CredentialMissingModeContext {
	requirements: PackageCredentialRequirement[] | undefined;
	targetProject: Project;
	user: User;
}

export function createFailure(
	reference: PackageCredentialRequirement,
	kind: CredentialResolutionFailureKind,
): CredentialResolutionFailure {
	return {
		kind,
		sourceId: reference.id,
		usedByWorkflows: [...reference.usedByWorkflows].sort(),
	};
}

/** Flattens the internal lookup `Map` into the serializable pairs exposed via events/responses. */
export function resolvedBindingsToSummaries(
	successes: ImportBindingMap,
): Array<{ sourceId: string; targetId: string }> {
	return [...successes].map(([sourceId, targetId]) => ({ sourceId, targetId }));
}
