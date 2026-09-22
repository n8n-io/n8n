import type { PolicyAction, PolicyRule } from '@n8n/api-types';
import { Container } from '@n8n/di';

import { CREDENTIAL_TYPES_KIND } from '@/modules/type-availability-policies/constants';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';

/**
 * Seeds a credential type policy through the service rather than over HTTP, because this
 * kind's REST routes are a separate ticket. The suites here judge what the check decides on
 * the real host paths, so the write route is not what they pin — swap this one helper for
 * `PUT /credential-type-policies/...` once those routes land.
 */
export async function putCredentialTypePolicy(
	projectId: string | null,
	{
		rules,
		defaultAction = 'allow',
		version = 0,
		updatedBy = 'test',
	}: {
		rules: PolicyRule[];
		defaultAction?: PolicyAction;
		version?: number;
		updatedBy?: string;
	},
) {
	return await Container.get(TypeAvailabilityPolicyService).setEffectivePolicy(
		CREDENTIAL_TYPES_KIND,
		projectId,
		{ rules, defaultAction },
		version,
		updatedBy,
	);
}

export const denyRule = (id: string, credentialType: string): PolicyRule => ({
	id,
	action: 'deny',
	selector: { kind: 'name', value: credentialType },
});
