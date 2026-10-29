import type { AvailableCredentialTypesResponse, CredentialTypeAvailability } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Get, Licensed, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { CredentialTypes } from '@/credential-types';

import { CREDENTIAL_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

/**
 * Only unavailable entries carry a reason, so the response stays small on the common path — the
 * builder fetches it on every workflow open.
 */
function toAvailabilityEntry(verdict: ComposedTypeVerdict): CredentialTypeAvailability {
	if (verdict.action === 'allow') return { name: verdict.name, available: true };

	return {
		name: verdict.name,
		available: false,
		scope: verdict.scope,
		...(verdict.matchedRuleId !== null && { matchedRuleId: verdict.matchedRuleId }),
		...(verdict.optInAvailable && { optInAvailable: true }),
	};
}

/**
 * The effective credential type set for one project — the builder UI's only source for what a
 * member may use and why. Gated on `project:read`, same as `AvailableTypesController`: reading
 * effective availability takes only project membership, while authoring the policy takes
 * `credentialTypePolicy:manage`.
 *
 * Kept out of `CredentialTypePolicyProjectController` because that controller's whole surface is
 * admin-gated, and this is the one read every member makes.
 */
@RestController('/projects/:projectId/available-credential-types')
export class AvailableCredentialTypesController {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly credentialTypes: CredentialTypes,
	) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('project:read')
	async getAvailableCredentialTypes(
		_req: Request,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<AvailableCredentialTypesResponse> {
		// The known-credentials registry, not the type descriptions: those are released from
		// memory after startup, and availability needs nothing but the names.
		const typeNames = Object.keys(this.credentialTypes.getKnownTypes());

		const verdicts = await this.service.evaluateComposedTypes(
			CREDENTIAL_TYPES_KIND,
			projectId,
			typeNames,
		);

		return verdicts.map(toAvailabilityEntry);
	}
}
