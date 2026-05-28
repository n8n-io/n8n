import type { Project, User } from '@n8n/db';

import type { ManifestCredentialRequirement } from '../../spec/manifest.schema';
import type { CredentialMatchingMode, CredentialMissingMode } from '../../n8n-packages.types';

export type WorkflowCredentialRequirement = ManifestCredentialRequirement;

export type CredentialResolutionFailureKind = 'not_found' | 'unknown_type';

export type CredentialResolutionFailure = {
	kind: CredentialResolutionFailureKind;
	sourceId: string;
	usedByWorkflows: string[];
};

export type CredentialId = string;

export type CredentialBinding = Map<CredentialId, CredentialId>;

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

export function createSuccessBinding(
	sourceId: CredentialId,
	targetId: CredentialId,
): CredentialBinding {
	return new Map([[sourceId, targetId]]);
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

export function getBindingSourceId(binding: CredentialBinding): CredentialId {
	const sourceId = binding.keys().next().value;
	if (sourceId === undefined) {
		throw new Error('Credential binding is empty');
	}
	return sourceId;
}

export function resolvedBindingsToSummaries(
	bindings: CredentialBinding[],
): Array<{ sourceId: string; targetId: string }> {
	return bindings.map((binding) => {
		const sourceId = getBindingSourceId(binding);
		const targetId = binding.get(sourceId);
		if (targetId === undefined || typeof targetId !== 'string') {
			throw new Error('Expected resolved credential binding');
		}
		return { sourceId, targetId };
	});
}
