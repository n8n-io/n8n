/**
 * Simple Memory Node - Version 1.3
 * Stores in n8n memory, so no credentials required
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryBufferWindowV13Params {
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
// Node Types
// ===========================================================================

interface LcMemoryBufferWindowV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow';
	version: 1.3;
	isTrigger: true;
}

export type LcMemoryBufferWindowV13ParamsNode = LcMemoryBufferWindowV13NodeBase & {
	config: NodeConfig<LcMemoryBufferWindowV13Params>;
};

export type LcMemoryBufferWindowV13Node = LcMemoryBufferWindowV13ParamsNode;