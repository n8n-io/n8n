/**
 * Simple Memory Node - Version 1.2
 * Stores in n8n memory, so no credentials required
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryBufferWindowV12Params {
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
	contextWindowLength?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryBufferWindowV12Node = {
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow';
	version: 1.2;
	config: NodeConfig<LcMemoryBufferWindowV12Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};