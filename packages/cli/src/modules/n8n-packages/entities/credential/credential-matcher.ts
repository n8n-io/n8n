import type { Project, SharedCredentialsRepository, User } from '@n8n/db';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import {
	createFailure,
	getBindingSourceId,
	type CredentialBinding,
	type CredentialResolution,
	type CredentialResolutionFailure,
	type WorkflowCredentialRequirement,
} from './credential.types';

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
		requirements: WorkflowCredentialRequirement[] | undefined,
		context: CredentialMatcherContext,
	): Promise<CredentialResolution> {
		const { known, unknownTypeFailures } = partitionByKnownType(requirements, this.credentialTypes);

		const successes = await this.resolve(known, context);
		const matchedSourceIds = new Set(successes.map((binding) => getBindingSourceId(binding)));

		const notFoundFailures = known
			.filter((reference) => !matchedSourceIds.has(reference.id))
			.map((reference) => createFailure(reference, 'not_found'));

		return { successes, failures: [...unknownTypeFailures, ...notFoundFailures] };
	}

	protected abstract resolve(
		known: WorkflowCredentialRequirement[],
		context: CredentialMatcherContext,
	): Promise<CredentialBinding[]>;
}

function partitionByKnownType(
	requirements: WorkflowCredentialRequirement[] | undefined,
	credentialTypes: CredentialTypes,
): {
	known: WorkflowCredentialRequirement[];
	unknownTypeFailures: CredentialResolutionFailure[];
} {
	const known: WorkflowCredentialRequirement[] = [];
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
