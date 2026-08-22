import type { CredentialResolution, CredentialResolutionFailure } from './credential.types';
import type { CredentialMissingMode } from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

export function canStubNotFoundFailure(failure: CredentialResolutionFailure): boolean {
	return failure.kind === 'not_found' && failure.targetId === undefined;
}

/**
 * Classifies which unresolved credential references block the import, per missing-mode
 * policy. Read-only — never writes.
 */
const rescueStubbable = (resolution: CredentialResolution): CredentialResolutionFailure[] =>
	resolution.failures.filter((failure) => !canStubNotFoundFailure(failure));

/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
const BLOCKING_FAILURES: Record<
	CredentialMissingMode,
	(resolution: CredentialResolution) => CredentialResolutionFailure[]
> = {
	'must-preexist': (resolution) => resolution.failures,
	'create-stub': rescueStubbable,
	'create-with-values': rescueStubbable,
};
/* eslint-enable @typescript-eslint/naming-convention */

export function credentialBlockingFailures(
	mode: CredentialMissingMode,
	resolution: CredentialResolution,
): CredentialResolutionFailure[] {
	return BLOCKING_FAILURES[mode](resolution);
}

/** Whether the mode fills an unresolved reference by creating the credential. */
export function credentialMissingModeCreates(mode: CredentialMissingMode): boolean {
	return mode === 'create-stub' || mode === 'create-with-values';
}

/** Whether the mode seeds created credentials from the package's bundled expression data. */
export function credentialMissingModeUsesPackageData(mode: CredentialMissingMode): boolean {
	return mode === 'create-with-values';
}

/** Package workflow ids that should not be published because they use stubbed credentials. */
export function workflowsBlockedFromPublish(
	requirements: PackageCredentialRequirement[] | undefined,
	stubbedSourceIds: ReadonlySet<string>,
): Set<string> {
	const blocked = new Set<string>();

	for (const requirement of requirements ?? []) {
		if (!stubbedSourceIds.has(requirement.id)) continue;

		for (const sourceWorkflowId of requirement.usedByWorkflows) {
			blocked.add(sourceWorkflowId);
		}
	}

	return blocked;
}
