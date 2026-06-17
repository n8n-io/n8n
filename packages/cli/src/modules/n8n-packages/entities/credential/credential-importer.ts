import { Service } from '@n8n/di';

import { CredentialMatcherFactory } from './credential-matcher-factory';
import { credentialBlockingFailures } from './credential-missing-mode';
import type {
	CredentialBindingRequest,
	CredentialResolution,
	CredentialResolutionFailure,
} from './credential.types';

@Service()
export class CredentialImporter {
	constructor(private readonly credentialMatcherFactory: CredentialMatcherFactory) {}

	/**
	 * Resolves which target-project credentials the package's references map to.
	 * Read-only: returns matched `successes` and unresolved `failures` without
	 * acting on the failures. Mirrors the workflow side's `plan`.
	 */
	async plan(request: CredentialBindingRequest): Promise<CredentialResolution> {
		return await this.credentialMatcherFactory
			.getMatcher(request.matchingMode)
			.match(request.requirements, {
				targetProject: request.targetProject,
				user: request.user,
				credentialBindings: request.credentialBindings,
			});
	}

	/**
	 * Classifies which unresolved references block the import under the chosen
	 * missing-mode policy. Pure — the pipeline gates or reports these uniformly
	 * alongside other blocking issues.
	 */
	blockingFailures(
		resolution: CredentialResolution,
		request: CredentialBindingRequest,
	): CredentialResolutionFailure[] {
		return credentialBlockingFailures(request.missingMode, resolution);
	}
}
