/**
 * Motorhead Node - Version 1.2
 * Use Motorhead Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV12Config {
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV12Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryMotorheadV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1.2;
	credentials?: LcMemoryMotorheadV12Credentials;
	isTrigger: true;
}

export type LcMemoryMotorheadV12Node = LcMemoryMotorheadV12NodeBase & {
	config: NodeConfig<LcMemoryMotorheadV12Config>;
};

export type LcMemoryMotorheadV12Node = LcMemoryMotorheadV12Node;