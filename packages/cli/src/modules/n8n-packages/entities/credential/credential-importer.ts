import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import { CredentialMatcherFactory } from './credential-matcher-factory';
import { credentialBlockingFailures } from './credential-missing-mode';
import type {
	CredentialApplyResult,
	CredentialBindingRequest,
	CredentialResolution,
	CredentialResolutionFailure,
} from './credential.types';
import type { ImportBindingMap } from '../../n8n-packages.types';

@Service()
export class CredentialImporter {
	constructor(
		private readonly credentialMatcherFactory: CredentialMatcherFactory,
		private readonly credentialsService: CredentialsService,
	) {}

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

	/**
	 * Creates stub credentials for unresolved `not_found` references under
	 * `create-stub`, then returns the full source→target binding map.
	 * {@link CredentialsService.createImportStubCredential} enforces `credential:create`
	 * on the target project.
	 */
	async apply(
		request: CredentialBindingRequest,
		resolution: CredentialResolution,
	): Promise<CredentialApplyResult> {
		const bindings: ImportBindingMap = new Map(resolution.successes);
		const matched = [...resolution.successes.keys()];
		const stubbed: string[] = [];

		if (request.missingMode !== 'create-stub') {
			return { bindings, matched, stubbed };
		}

		const credentialsToStub = stubbableCredentialFailures(resolution.failures);

		for (const credential of credentialsToStub) {
			const { sourceId, type, name } = credential;
			if (type === undefined) {
				throw new UnexpectedError(
					`Cannot create stub for credential "${sourceId}": missing credential type`,
				);
			}

			const stubCredential = await this.credentialsService.createImportStubCredential(
				{
					name: name ?? sourceId,
					type,
					projectId: request.targetProject.id,
				},
				request.user,
			);

			bindings.set(sourceId, stubCredential.id);
			stubbed.push(sourceId);
		}

		return { bindings, matched, stubbed };
	}
}

/** First `not_found` failure per source id that has no explicit binding target. */
function stubbableCredentialFailures(
	failures: CredentialResolutionFailure[],
): CredentialResolutionFailure[] {
	return [
		...new Map(
			failures
				.filter((failure) => failure.kind === 'not_found' && failure.targetId === undefined)
				.map((failure) => [failure.sourceId, failure] as const),
		).values(),
	];
}
