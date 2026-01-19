/**
 * Motorhead Node - Version 1
 * Use Motorhead Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV1Params {
	sessionId: string | Expression<string>;
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV1Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryMotorheadV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1;
	credentials?: LcMemoryMotorheadV1Credentials;
	isTrigger: true;
}

export type LcMemoryMotorheadV1ParamsNode = LcMemoryMotorheadV1NodeBase & {
	config: NodeConfig<LcMemoryMotorheadV1Params>;
};

export type LcMemoryMotorheadV1Node = LcMemoryMotorheadV1ParamsNode;