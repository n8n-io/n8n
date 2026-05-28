import { SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import {
	createSuccessBinding,
	type CredentialBinding,
	type WorkflowCredentialRequirement,
} from './credential.types';
import { CredentialMatcher, type CredentialMatcherContext } from './credential-matcher';
import { resolveCredentialIdsById } from './utils/resolve-credential-ids';

@Service()
export class IdBasedCredentialMatcher extends CredentialMatcher {
	constructor(
		credentialsFinderService: CredentialsFinderService,
		sharedCredentialsRepository: SharedCredentialsRepository,
		credentialTypes: CredentialTypes,
	) {
		super(credentialsFinderService, sharedCredentialsRepository, credentialTypes);
	}

	protected async resolve(
		known: WorkflowCredentialRequirement[],
		context: CredentialMatcherContext,
	): Promise<CredentialBinding[]> {
		const resolvedIds = await resolveCredentialIdsById(
			known.map((reference) => reference.id),
			context.targetProject,
			context.user,
			this.sharedCredentialsRepository,
			this.credentialsFinderService,
		);

		return known
			.filter((reference) => resolvedIds.has(reference.id))
			.map((reference) => createSuccessBinding(reference.id, reference.id));
	}
}
