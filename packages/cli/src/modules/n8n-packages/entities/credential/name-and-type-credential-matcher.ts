import { SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

import {
	CredentialMatcher,
	type CredentialMatcherContext,
	type ResolvedCredentialMatch,
	type UsableCredential,
} from './credential-matcher';
import { resolveByCandidateFilter } from './credential-tier-selection';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

@Service()
export class NameAndTypeCredentialMatcher extends CredentialMatcher {
	constructor(
		credentialsFinderService: CredentialsFinderService,
		sharedCredentialsRepository: SharedCredentialsRepository,
		credentialTypes: CredentialTypes,
		credentialsService: CredentialsService,
	) {
		super(
			credentialsFinderService,
			sharedCredentialsRepository,
			credentialTypes,
			credentialsService,
		);
	}

	protected resolve(
		unbound: PackageCredentialRequirement[],
		usableCredentials: UsableCredential[],
		context: CredentialMatcherContext,
	): Map<string, ResolvedCredentialMatch> {
		return resolveByCandidateFilter(
			unbound,
			usableCredentials,
			context.projectId,
			(candidate, reference) =>
				candidate.name === reference.name && candidate.type === reference.type,
		);
	}
}
