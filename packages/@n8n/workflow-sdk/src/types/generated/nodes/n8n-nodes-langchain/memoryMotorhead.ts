/**
 * Motorhead Node Types
 *
 * Use Motorhead Memory
 * @subnodeType ai_memory
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/memorymotorhead/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV13Params {
	sessionId: string | Expression<string>;
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
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

export type LcMemoryMotorheadV13Node = {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcMemoryMotorheadV13Params>;
	credentials?: LcMemoryMotorheadV13Credentials;
	isTrigger: true;
};

export type LcMemoryMotorheadNode = LcMemoryMotorheadV13Node;
