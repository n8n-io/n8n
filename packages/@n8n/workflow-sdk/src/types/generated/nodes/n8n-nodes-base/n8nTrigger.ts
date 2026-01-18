/**
 * n8n Trigger Node Types
 *
 * Handle events and perform actions on your n8n instance
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/n8ntrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface N8nTriggerV1Params {
	/**
 * Specifies under which conditions an execution should happen:
				&lt;ul&gt;
					&lt;li&gt;&lt;b&gt;Published Workflow Updated&lt;/b&gt;: Triggers when workflow version is published from a published state (workflow was already published)&lt;/li&gt;
					&lt;li&gt;&lt;b&gt;Instance Started&lt;/b&gt;:  Triggers when this n8n instance is started or re-started&lt;/li&gt;
					&lt;li&gt;&lt;b&gt;Workflow Published&lt;/b&gt;: Triggers when workflow version is published from an unpublished state (workflow was unpublished)&lt;/li&gt;
				&lt;/ul&gt;
 * @default []
 */
	events: Array<'update' | 'init' | 'activate'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type N8nTriggerV1Node = {
	type: 'n8n-nodes-base.n8nTrigger';
	version: 1;
	config: NodeConfig<N8nTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type N8nTriggerNode = N8nTriggerV1Node;
