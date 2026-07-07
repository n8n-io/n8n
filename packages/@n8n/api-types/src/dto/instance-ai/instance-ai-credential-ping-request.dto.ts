import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Probe a saved credential against a workflow node's own URL (generic auth
 * types have no declarative test). Only ids travel — the server resolves the
 * target from the persisted node and decrypts the credential itself.
 */
export class InstanceAiCredentialPingRequestDto extends Z.class({
	credentialId: z.string().min(1),
	workflowId: z.string().min(1),
	nodeName: z.string().min(1),
	/** Service-specific codes that must not count as rejection (from the
	 *  agent's setup hint). Only relaxes the 401/403 default — codes outside
	 *  that pair pass regardless, so this can never tighten the verdict. */
	acceptedStatusCodes: z.array(z.number().int()).max(10).optional(),
}) {}
