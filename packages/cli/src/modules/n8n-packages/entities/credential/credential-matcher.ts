import type { Project, SharedCredentialsRepository, User } from '@n8n/db';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import {
	createFailure,
	type CredentialResolution,
	type CredentialResolutionFailure,
} from './credential.types';
import type { ImportBindingMap } from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

export interface CredentialMatcherContext {
	targetProject: Project;
	user: User;
	credentialBindings?: ImportBindingMap;
}

export abstract class CredentialMatcher {
	constructor(
		protected readonly credentialsFinderService: CredentialsFinderService,
		protected readonly sharedCredentialsRepository: SharedCredentialsRepository,
		protected readonly credentialTypes: CredentialTypes,
	) {}

	async match(
		requirements: PackageCredentialRequirement[] | undefined,
		context: CredentialMatcherContext,
	): Promise<CredentialResolution> {
		const orphanFailures = orphanBindingFailures(context.credentialBindings, requirements);
		const { known, unknownTypeFailures } = partitionByKnownType(requirements, this.credentialTypes);

		const successes = await this.resolve(known, context);

		const notFoundFailures = known
			.filter((reference) => !successes.has(reference.id))
			.map((reference) =>
				createNotFoundFailure(reference, context.credentialBindings?.get(reference.id)),
			);

		return {
			successes,
			failures: [...orphanFailures, ...unknownTypeFailures, ...notFoundFailures],
		};
	}

	protected abstract resolve(
		known: PackageCredentialRequirement[],
		context: CredentialMatcherContext,
	): Promise<ImportBindingMap>;
}

function partitionByKnownType(
	requirements: PackageCredentialRequirement[] | undefined,
	credentialTypes: CredentialTypes,
): {
	known: PackageCredentialRequirement[];
	unknownTypeFailures: CredentialResolutionFailure[];
} {
	const known: PackageCredentialRequirement[] = [];
	const unknownTypeFailures: CredentialResolutionFailure[] = [];

	for (const reference of requirements ?? []) {
		if (credentialTypes.recognizes(reference.type)) {
			known.push(reference);
		} else {
			unknownTypeFailures.push(createFailure(reference, 'unknown_type'));
		}
	}

	return { known, unknownTypeFailures };
}

/**
 * When the importer supplied an explicit binding, include the requested target id on
 * the failure so callers can report which credential was unreachable.
 */
function createNotFoundFailure(
	reference: PackageCredentialRequirement,
	requestedTargetId: string | undefined,
): CredentialResolutionFailure {
	const failure = createFailure(reference, 'not_found');
	return requestedTargetId === undefined ? failure : { ...failure, targetId: requestedTargetId };
}

/**
 * Rejects explicit bindings whose source id is not declared in the package.
 * These cannot go through normal requirement matching because there is no
 * package credential entry to resolve against.
 */
function orphanBindingFailures(
	bindings: ImportBindingMap | undefined,
	requirements: PackageCredentialRequirement[] | undefined,
): CredentialResolutionFailure[] {
	if (!bindings || bindings.size === 0) return [];

	const requirementIds = new Set((requirements ?? []).map((requirement) => requirement.id));
	const failures: CredentialResolutionFailure[] = [];

	for (const [sourceId, targetId] of bindings) {
		if (!requirementIds.has(sourceId)) {
			failures.push({
				kind: 'source_not_found',
				sourceId,
				targetId,
				usedByWorkflows: [],
			});
		}
	}

	return failures;
}
