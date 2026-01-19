/**
 * SSE Trigger Node - Version 1
 * Triggers the workflow when Server-Sent Events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SseTriggerV1Config {
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

interface SseTriggerV1NodeBase {
	type: 'n8n-nodes-base.sseTrigger';
	version: 1;
	isTrigger: true;
}

export type SseTriggerV1Node = SseTriggerV1NodeBase & {
	config: NodeConfig<SseTriggerV1Config>;
};

export type SseTriggerV1Node = SseTriggerV1Node;