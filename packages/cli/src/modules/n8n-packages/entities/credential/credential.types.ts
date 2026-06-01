import type { Project, User } from '@n8n/db';

import type { CredentialMatchingMode, CredentialMissingMode } from '../../n8n-packages.types';

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

export type CredentialId = string;

export interface CredentialBinding {
	sourceId: CredentialId;
	targetId: CredentialId;
}

export interface CredentialResolution {
	successes: CredentialBinding[];
	failures: CredentialResolutionFailure[];
}

export interface CredentialBindingRequest {
	requirements: WorkflowCredentialRequirement[] | undefined;
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
	requirements: WorkflowCredentialRequirement[] | undefined;
	targetProject: Project;
	user: User;
}

export function createSuccessBinding(
	sourceId: CredentialId,
	targetId: CredentialId,
): CredentialBinding {
	return { sourceId, targetId };
}

export function createFailure(
	reference: WorkflowCredentialRequirement,
	kind: CredentialResolutionFailureKind,
): CredentialResolutionFailure {
	return {
		kind,
		sourceId: reference.id,
		usedByWorkflows: [...reference.usedByWorkflows].sort(),
	};
}

export function resolvedBindingsToSummaries(
	bindings: CredentialBinding[],
): Array<{ sourceId: string; targetId: string }> {
	return bindings.map(({ sourceId, targetId }) => ({ sourceId, targetId }));
}
