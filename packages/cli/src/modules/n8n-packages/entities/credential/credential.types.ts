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

export type CredentialResolutionFailureKind =
	| 'not_found'
	| 'unknown_type'
	| 'source_not_found'
	| 'type_mismatch';

export type CredentialResolutionFailure = {
	kind: CredentialResolutionFailureKind;
	sourceId: string;
	name?: string;
	type?: string;
	targetId?: string;
	/** For `type_mismatch`: the credential type the package's workflow node requires. */
	expectedType?: string;
	/** For `type_mismatch`: the actual type of the resolved target credential. */
	actualType?: string;
	usedByWorkflows: string[];
};

export interface CredentialResolution {
	successes: ImportBindingMap;
	failures: CredentialResolutionFailure[];
}

export interface CredentialApplyResult {
	bindings: ImportBindingMap;
	matched: string[];
	stubbed: string[];
}

export interface CredentialBindingRequest {
	requirements: PackageCredentialRequirement[] | undefined;
	matchingMode: CredentialMatchingMode;
	missingMode: CredentialMissingMode;
	credentialBindings?: ImportBindingMap;
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
		usedByWorkflows: [...reference.usedByWorkflows].sort(),
	};
}
