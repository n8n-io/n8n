/**
 * Motorhead Node - Version 1.1
 * Use Motorhead Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV11Params {
/**
 * The key to use to store the memory
 * @default ={{ $json.sessionId }}
 */
		sessionId?: string | Expression<string>;
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV11Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryMotorheadV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1.1;
	credentials?: LcMemoryMotorheadV11Credentials;
	isTrigger: true;
}

export type LcMemoryMotorheadV11ParamsNode = LcMemoryMotorheadV11NodeBase & {
	config: NodeConfig<LcMemoryMotorheadV11Params>;
};

export type LcMemoryMotorheadV11Node = LcMemoryMotorheadV11ParamsNode;