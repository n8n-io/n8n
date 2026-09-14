import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';

import {
	CredentialMatcher,
	type ResolvedCredentialMatch,
	type UsableCredential,
} from './credential-matcher';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

@Service()
export class IdBasedCredentialMatcher extends CredentialMatcher {
	constructor(credentialTypes: CredentialTypes, credentialsService: CredentialsService) {
		super(credentialTypes, credentialsService);
	}

	protected resolve(
		unbound: PackageCredentialRequirement[],
		usableCredentials: UsableCredential[],
	): Map<string, ResolvedCredentialMatch> {
		const usableTypesById = new Map(
			usableCredentials.map((credential) => [credential.id, credential.type]),
		);

		return new Map(
			unbound.flatMap((reference) => {
				const targetType = usableTypesById.get(reference.id);
				if (targetType === undefined) return [];
				return [[reference.id, { targetId: reference.id, targetType }] as const];
			}),
		);
	}
}
