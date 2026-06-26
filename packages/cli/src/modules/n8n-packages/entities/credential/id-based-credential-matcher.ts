import { SharedCredentialsRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

import {
	CredentialMatcher,
	type CredentialMatcherContext,
	type ResolvedCredentialMatch,
} from './credential-matcher';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

@Service()
export class IdBasedCredentialMatcher extends CredentialMatcher {
	constructor(
		credentialsFinderService: CredentialsFinderService,
		sharedCredentialsRepository: SharedCredentialsRepository,
		credentialTypes: CredentialTypes,
		private readonly credentialsService: CredentialsService,
	) {
		super(credentialsFinderService, sharedCredentialsRepository, credentialTypes);
	}

	protected async resolve(
		known: PackageCredentialRequirement[],
		context: CredentialMatcherContext,
	): Promise<Map<string, ResolvedCredentialMatch>> {
		if (known.length === 0) {
			return new Map();
		}

		const bindings = context.credentialBindings;
		const usableTypesById = await this.findUsableCredentialTypesById(
			context.projectId,
			context.user,
		);

		return new Map(
			known.flatMap((reference) => {
				const targetId = bindings?.get(reference.id) ?? reference.id;
				const targetType = usableTypesById.get(targetId);
				if (targetType === undefined) return [];
				return [[reference.id, { targetId, targetType }] as const];
			}),
		);
	}

	/** Maps each credential the user can use in the target project to its type. */
	private async findUsableCredentialTypesById(
		projectId: string,
		user: User,
	): Promise<Map<string, string>> {
		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId },
		);

		return new Map(usableCredentials.map((credential) => [credential.id, credential.type]));
	}
}
