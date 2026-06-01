import { Service } from '@n8n/di';

import { CredentialMatcherFactory } from './credential-matcher-factory';
import { CredentialMissingModeFactory } from './credential-missing-mode-factory';
import type { CredentialBindingRequest, CredentialResolution } from './credential.types';

@Service()
export class CredentialImporter {
	constructor(
		private readonly matcherFactory: CredentialMatcherFactory,
		private readonly missingModeFactory: CredentialMissingModeFactory,
	) {}

	async resolveForImport(request: CredentialBindingRequest): Promise<CredentialResolution> {
		const matched = await this.matcherFactory
			.getMatcher(request.matchingMode)
			.match(request.requirements, {
				targetProject: request.targetProject,
				user: request.user,
			});

		return await this.missingModeFactory.getHandler(request.missingMode).handle(matched, {
			requirements: request.requirements,
			targetProject: request.targetProject,
			user: request.user,
		});
	}
}
