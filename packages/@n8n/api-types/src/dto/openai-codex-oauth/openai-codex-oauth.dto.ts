import { z } from 'zod';

import { Z } from '../../zod-class';

export class StartCodexOAuthFlowDto extends Z.class({
	credentialId: z.string().min(1).max(64),
}) {}

export class CompleteCodexOAuthFlowDto extends Z.class({
	flowId: z.string().min(1).max(128),
	/**
	 * Only used by the manual fallback: the full redirect URL (or bare query
	 * string / code) the user copied out of the browser after authorizing.
	 * Omitted when the loopback listener captured the callback itself.
	 */
	redirectInput: z.string().min(1).max(4096).optional(),
}) {}
