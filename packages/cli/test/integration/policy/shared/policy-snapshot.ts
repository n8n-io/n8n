import { Container } from '@n8n/di';

import { TypeAvailabilityPolicySnapshot } from '@/modules/type-availability-policies/type-availability-policy-snapshot';

/**
 * Reloads the in-process policy snapshot from the database.
 *
 * Call this wherever a test writes behind the service, such as truncating the policy tables.
 * Production writes go through the service, which reloads the snapshot itself.
 */
export async function reloadPolicySnapshot(): Promise<void> {
	await Container.get(TypeAvailabilityPolicySnapshot).reload();
}
