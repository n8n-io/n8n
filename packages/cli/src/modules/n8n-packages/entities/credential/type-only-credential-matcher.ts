import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
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
export class TypeOnlyCredentialMatcher extends CredentialMatcher {
	constructor(credentialTypes: CredentialTypes, credentialsService: CredentialsService) {
		super(credentialTypes, credentialsService);
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
			(candidate, reference) => candidate.type === reference.type,
		);
	}
}
