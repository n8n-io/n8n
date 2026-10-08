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
/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
const BLOCKING_FAILURES: Record<
	CredentialMissingMode,
	(resolution: CredentialResolution) => CredentialResolutionFailure[]
> = {
	'must-preexist': (resolution) => resolution.failures,
	'create-stub': (resolution) =>
		resolution.failures.filter((failure) => !canStubNotFoundFailure(failure)),
};
/* eslint-enable @typescript-eslint/naming-convention */

export function credentialBlockingFailures(
	mode: CredentialMissingMode,
	resolution: CredentialResolution,
): CredentialResolutionFailure[] {
	return BLOCKING_FAILURES[mode](resolution);
}

/**
 * The stubs the import creates: one stubbable `not_found` failure per source id (the last one
 * seen), and none unless the mode is `create-stub`. Apply writes these and the plan checks them
 * against policy, so both read this one list.
 */
export function credentialsToStub(
	mode: CredentialMissingMode,
	resolution: CredentialResolution,
): CredentialResolutionFailure[] {
	if (mode !== 'create-stub') return [];

	return [
		...new Map(
			resolution.failures
				.filter((failure) => canStubNotFoundFailure(failure))
				.map((failure) => [failure.sourceId, failure] as const),
		).values(),
	];
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
