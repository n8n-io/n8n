/**
 * Simple Memory Node - Version 1
 * Stores in n8n memory, so no credentials required
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
// Node Types
// ===========================================================================

interface LcMemoryBufferWindowV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow';
	version: 1;
	isTrigger: true;
}

export type LcMemoryBufferWindowV1ParamsNode = LcMemoryBufferWindowV1NodeBase & {
	config: NodeConfig<LcMemoryBufferWindowV1Params>;
};

export type LcMemoryBufferWindowV1Node = LcMemoryBufferWindowV1ParamsNode;