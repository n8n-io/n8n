/**
 * Simple Memory Node - Version 1.2
 * Stores in n8n memory, so no credentials required
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
// Node Types
// ===========================================================================

interface LcMemoryBufferWindowV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow';
	version: 1.2;
	isTrigger: true;
}

export type LcMemoryBufferWindowV12ParamsNode = LcMemoryBufferWindowV12NodeBase & {
	config: NodeConfig<LcMemoryBufferWindowV12Params>;
};

export type LcMemoryBufferWindowV12Node = LcMemoryBufferWindowV12ParamsNode;