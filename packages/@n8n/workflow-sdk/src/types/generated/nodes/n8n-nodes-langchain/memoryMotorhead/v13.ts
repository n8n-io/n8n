/**
 * Motorhead Node - Version 1.3
 * Use Motorhead Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV13Config {
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV13Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryMotorheadV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1.3;
	credentials?: LcMemoryMotorheadV13Credentials;
	isTrigger: true;
}

export type LcMemoryMotorheadV13Node = LcMemoryMotorheadV13NodeBase & {
	config: NodeConfig<LcMemoryMotorheadV13Config>;
};

export type LcMemoryMotorheadV13Node = LcMemoryMotorheadV13Node;