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
		const { known, unknownTypeFailures } = partitionByKnownType(requirements, this.credentialTypes);

		const successes = await this.resolve(known, context);

		const notFoundFailures = known
			.filter((reference) => !successes.has(reference.id))
			.map((reference) => createFailure(reference, 'not_found'));

		return { successes, failures: [...unknownTypeFailures, ...notFoundFailures] };
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
