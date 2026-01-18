/**
 * SSE Trigger Node Types
 *
 * Triggers the workflow when Server-Sent Events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/ssetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SseTriggerV1Params {
	/**
	 * The URL to receive the SSE from
	 */
	url: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type SseTriggerV1Node = {
	type: 'n8n-nodes-base.sseTrigger';
	version: 1;
	config: NodeConfig<SseTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type SseTriggerNode = SseTriggerV1Node;
