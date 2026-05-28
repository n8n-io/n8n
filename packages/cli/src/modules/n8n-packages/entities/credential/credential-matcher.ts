import { SharedCredentialsRepository } from '@n8n/db';
import type { Project, User } from '@n8n/db';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import {
	createFailureBinding,
	getBindingSourceId,
	type CredentialBinding,
	type CredentialResolution,
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
			.map((reference) => createFailureBinding(reference.id, 'not_found'));

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
	unknownTypeFailures: CredentialBinding[];
} {
	const known: WorkflowCredentialRequirement[] = [];
	const unknownTypeFailures: CredentialBinding[] = [];

	for (const reference of requirements ?? []) {
		if (credentialTypes.recognizes(reference.type)) {
			known.push(reference);
		} else {
			unknownTypeFailures.push(createFailureBinding(reference.id, 'unknown_type'));
		}
	}

	return { known, unknownTypeFailures };
}
