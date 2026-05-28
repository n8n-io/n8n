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

export type CredentialBindingValue = CredentialId | { failed: CredentialResolutionFailureKind };

export type CredentialBinding = Map<CredentialId, CredentialBindingValue>;

export interface CredentialResolution {
	successes: CredentialBinding[];
	failures: CredentialBinding[];
}

export interface CredentialBindingRequest {
	requirements: WorkflowCredentialRequirement[] | undefined;
	matchingMode: CredentialMatchingMode;
	missingMode: CredentialMissingMode;
	targetProject: Project;
	user: User;
}

export function isFailedBindingValue(
	value: CredentialBindingValue,
): value is { failed: CredentialResolutionFailureKind } {
	return typeof value === 'object' && 'failed' in value;
}

export function createSuccessBinding(
	sourceId: CredentialId,
	targetId: CredentialId,
): CredentialBinding {
	return new Map([[sourceId, targetId]]);
}

export function createFailureBinding(
	sourceId: CredentialId,
	failureKind: CredentialResolutionFailureKind,
): CredentialBinding {
	return new Map([[sourceId, { failed: failureKind }]]);
}

export function getBindingSourceId(binding: CredentialBinding): CredentialId {
	const sourceId = binding.keys().next().value;
	if (sourceId === undefined) {
		throw new Error('Credential binding is empty');
	}
	return sourceId;
}

export function failureBindingsToApiFailures(
	bindings: CredentialBinding[],
	requirements: WorkflowCredentialRequirement[],
): CredentialResolutionFailure[] {
	const requirementsById = new Map(requirements.map((reference) => [reference.id, reference]));

	return bindings.map((binding) => {
		const sourceId = getBindingSourceId(binding);
		const value = binding.get(sourceId);
		if (value === undefined || !isFailedBindingValue(value)) {
			throw new Error('Expected failed credential binding');
		}

		const reference = requirementsById.get(sourceId);
		if (!reference) {
			throw new Error(`Missing manifest requirement for credential ${sourceId}`);
		}

		return {
			kind: value.failed,
			sourceId: reference.id,
			usedByWorkflows: [...reference.usedByWorkflows].sort(),
		};
	});
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
