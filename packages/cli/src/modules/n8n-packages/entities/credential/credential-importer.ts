import { Service } from '@n8n/di';

import { CredentialMatcherFactory } from './credential-matcher-factory';
import { CredentialMissingModeFactory } from './credential-missing-mode-factory';
import type { CredentialBindingRequest, CredentialResolution } from './credential.types';

@Service()
export class CredentialImporter {
	constructor(
		private readonly credentialMatcherFactory: CredentialMatcherFactory,
		private readonly credentialMissingModeFactory: CredentialMissingModeFactory,
	) {}

	async resolveForImport(request: CredentialBindingRequest): Promise<CredentialResolution> {
		const matched = await this.credentialMatcherFactory
			.getMatcher(request.matchingMode)
			.match(request.requirements, {
				targetProject: request.targetProject,
				user: request.user,
			});

		return await this.credentialMissingModeFactory.getHandler(request.missingMode).handle(matched, {
			requirements: request.requirements,
			targetProject: request.targetProject,
			user: request.user,
		});
	}
}
