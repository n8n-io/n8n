import type { EgressProtectionModeDto } from '@n8n/api-types';

export const EGRESS_PROTECTION_STORE = 'egressProtection';

export const EGRESS_PROTECTION_MODES: EgressProtectionModeDto[] = ['off', 'log', 'enforce'];
