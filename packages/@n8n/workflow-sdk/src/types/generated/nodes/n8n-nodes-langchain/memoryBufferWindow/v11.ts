/**
 * Simple Memory Node - Version 1.1
 * Stores in n8n memory, so no credentials required
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryBufferWindowV11Params {
/**
 * The key to use to store the memory
 * @default ={{ $json.sessionId }}
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

interface LcMemoryBufferWindowV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow';
	version: 1.1;
	isTrigger: true;
}

export type LcMemoryBufferWindowV11ParamsNode = LcMemoryBufferWindowV11NodeBase & {
	config: NodeConfig<LcMemoryBufferWindowV11Params>;
};

export type LcMemoryBufferWindowV11Node = LcMemoryBufferWindowV11ParamsNode;