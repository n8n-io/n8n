/**
 * No Operation, do nothing Node Types
 *
 * No Operation
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/noop/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface NoOpV1Params {}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type NoOpV1Node = {
	type: 'n8n-nodes-base.noOp';
	version: 1;
	config: NodeConfig<NoOpV1Params>;
	credentials?: Record<string, never>;
};

export type NoOpNode = NoOpV1Node;
