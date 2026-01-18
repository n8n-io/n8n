/**
 * Simple Memory Node - Version 1.3
 * Stores in n8n memory, so no credentials required
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryBufferWindowV13Params {
/**
 * The key to use to store the memory in the workflow data
 * @displayOptions.show { @version: [1] }
 * @default chat_history
 */
		sessionKey?: string | Expression<string>;
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
	contextWindowLength?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryBufferWindowV13Node = {
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcMemoryBufferWindowV13Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};