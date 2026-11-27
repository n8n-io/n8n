import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import { REQUEST_FED_CREDENTIAL_TYPES_KIND } from './constants';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Decides whether a credential type may receive a value from the incoming request through a
 * run-time stub credential. Nothing is configured by default, and an unconfigured scope allows
 * everything, so the feature works with no setup.
 *
 * Inactive until `TypeAvailabilityPoliciesModule` initializes. Before that, its tables and
 * snapshot do not exist, so callers must not resolve this class from the container. Read
 * `isActive` first.
 */
@Service()
export class RequestFedCredentialTypePolicy {
	/** Static, so a caller can read it without building the class and its repositories. The module sets it on init. */
	static isActive = false;

	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
	) {}

	/** Throws when the instance or the project policy denies the type. */
	async assertAllowed(credentialType: string, projectId: string | null): Promise<void> {
		const blocked = await this.getBlockedTypes([credentialType], projectId);
		const scope = blocked.get(credentialType);
		if (!scope) return;

		const by = scope === 'instance' ? 'an instance policy' : 'a project policy';
		throw new UserError(
			`Credential type "${credentialType}" cannot receive a value from the request: it is blocked by ${by}`,
		);
	}

	/**
	 * The scope that blocks each denied type. A type that is allowed is not in the map. Returns an
	 * empty map when the policy is inactive or unlicensed, because then nothing is enforced.
	 */
	async getBlockedTypes(
		credentialTypes: readonly string[],
		projectId: string | null,
	): Promise<Map<string, 'instance' | 'project'>> {
		const blocked = new Map<string, 'instance' | 'project'>();
		if (!RequestFedCredentialTypePolicy.isActive) return blocked;
		// An expired license stops enforcing, matching the routes that author the policy.
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)) return blocked;
		if (credentialTypes.length === 0) return blocked;

		const { verdicts } = await this.service.evaluateComposedTypesFor(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			projectId,
			credentialTypes,
		);
		for (const verdict of verdicts) {
			if (verdict.action === 'deny') {
				blocked.set(verdict.name, verdict.scope === 'instance' ? 'instance' : 'project');
			}
		}
		return blocked;
	}
}
