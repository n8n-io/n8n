/**
 * ClickUp Trigger Node - Version 1
 * Handle ClickUp events via webhooks (Beta)
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ClickUpTriggerV1Config {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		team: string | Expression<string>;
	events: Array<'*' | 'folderCreated' | 'folderDeleted' | 'folderUpdated' | 'goalCreated' | 'goalDeleted' | 'goalUpdated' | 'keyResultCreated' | 'keyResultDelete' | 'keyResultUpdated' | 'listCreated' | 'listDeleted' | 'listUpdated' | 'spaceCreated' | 'spaceDeleted' | 'spaceUpdated' | 'taskAssigneeUpdated' | 'taskCommentPosted' | 'taskCommentUpdated' | 'taskCreated' | 'taskDeleted' | 'taskDueDateUpdated' | 'taskMoved' | 'taskStatusUpdated' | 'taskTagUpdated' | 'taskTimeEstimateUpdated' | 'taskTimeTrackedUpdated' | 'taskUpdated'>;
	filters?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface ClickUpTriggerV1Credentials {
	clickUpApi: CredentialReference;
	clickUpOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ClickUpTriggerV1NodeBase {
	type: 'n8n-nodes-base.clickUpTrigger';
	version: 1;
	credentials?: ClickUpTriggerV1Credentials;
	isTrigger: true;
}

export type ClickUpTriggerV1Node = ClickUpTriggerV1NodeBase & {
	config: NodeConfig<ClickUpTriggerV1Config>;
};

export type ClickUpTriggerV1Node = ClickUpTriggerV1Node;