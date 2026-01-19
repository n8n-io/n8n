/**
 * n8n Trigger Node - Version 1
 * Handle events and perform actions on your n8n instance
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface N8nTriggerV1Config {
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

interface N8nTriggerV1NodeBase {
	type: 'n8n-nodes-base.n8nTrigger';
	version: 1;
	isTrigger: true;
}

export type N8nTriggerV1Node = N8nTriggerV1NodeBase & {
	config: NodeConfig<N8nTriggerV1Config>;
};

export type N8nTriggerV1Node = N8nTriggerV1Node;