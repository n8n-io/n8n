import { Service } from '@n8n/di';

import { applyCredentialMatching } from './credential-matcher-factory';
import { applyCredentialMissingMode } from './credential-missing-mode';
import type { CredentialBindingRequest, CredentialResolution } from './credential.types';

@Service()
export class CredentialImporter {
	async resolveForImport(request: CredentialBindingRequest): Promise<CredentialResolution> {
		const matched = await applyCredentialMatching(request.matchingMode, request.requirements, {
			targetProject: request.targetProject,
			user: request.user,
		});

		return await applyCredentialMissingMode(request.missingMode, matched, {
			requirements: request.requirements,
			targetProject: request.targetProject,
			user: request.user,
		});
	}
}
