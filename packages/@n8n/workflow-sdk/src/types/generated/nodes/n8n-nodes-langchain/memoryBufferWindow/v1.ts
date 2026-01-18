/**
 * Simple Memory Node - Version 1
 * Stores in n8n memory, so no credentials required
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryBufferWindowV1Params {
/**
 * The key to use to store the memory in the workflow data
 * @default chat_history
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

export type LcMemoryBufferWindowV1Node = {
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow';
	version: 1;
	config: NodeConfig<LcMemoryBufferWindowV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};