import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types.js';
import { CredentialsService } from '@/credentials/credentials.service.js';

import {
	CredentialMatcher,
	type CredentialMatcherContext,
	type ResolvedCredentialMatch,
	type UsableCredential,
} from './credential-matcher.js';
import { resolveByCandidateFilter } from './credential-tier-selection.js';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema.js';

@Service()
export class NameAndTypeCredentialMatcher extends CredentialMatcher {
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
			(candidate, reference) =>
				candidate.name === reference.name && candidate.type === reference.type,
		);
	}
}
