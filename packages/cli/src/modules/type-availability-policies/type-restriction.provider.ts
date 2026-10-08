import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Service } from '@n8n/di';

import type {
	RestrictableTypeKind,
	TypeRestriction,
	TypeRestrictionProvider,
} from '@/policy/type-restriction-provider-proxy.service';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from './constants';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

const POLICY_KINDS = {
	node: NODE_TYPES_KIND,
	credential: CREDENTIAL_TYPES_KIND,
} as const satisfies Record<RestrictableTypeKind, string>;

@Service()
export class TypeAvailabilityRestrictionProvider implements TypeRestrictionProvider {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
	) {}

	async findRestrictedTypes(
		kind: RestrictableTypeKind,
		projectId: string | null,
		typeNames: readonly string[],
	): Promise<ReadonlyMap<string, TypeRestriction>> {
		// An expired license stops enforcing, as the policy checks do.
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)) {
			return new Map();
		}

		const { verdicts } = await this.service.evaluateComposedTypesFor(
			POLICY_KINDS[kind],
			projectId,
			typeNames,
		);

		return new Map(
			verdicts
				.filter((verdict) => verdict.action === 'deny')
				.map((verdict) => [verdict.name, { scope: verdict.scope }]),
		);
	}
}
