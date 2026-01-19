/**
 * No Operation, do nothing Node - Version 1
 * No Operation
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface NoOpV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface NoOpV1NodeBase {
	type: 'n8n-nodes-base.noOp';
	version: 1;
}

export type NoOpV1ParamsNode = NoOpV1NodeBase & {
	config: NodeConfig<NoOpV1Params>;
};

export type NoOpV1Node = NoOpV1ParamsNode;