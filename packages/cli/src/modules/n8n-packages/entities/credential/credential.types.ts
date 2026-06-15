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

export type CredentialResolutionFailureKind = 'not_found' | 'unknown_type' | 'source_not_found';

export type CredentialResolutionFailure = {
	kind: CredentialResolutionFailureKind;
	sourceId: string;
	targetId?: string;
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
	credentialBindings?: ImportBindingMap;
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
