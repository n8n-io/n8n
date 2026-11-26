import type { PolicyKind } from '@n8n/telemetry';

import type { RestrictedTypeKind } from './type-availability-policies.constants';

export const TELEMETRY_POLICY_KIND: Record<RestrictedTypeKind, PolicyKind> = {
	node: 'node-types',
	credential: 'credential-types',
};
