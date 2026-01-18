/**
 * ClickUp Trigger Node Types
 *
 * Handle ClickUp events via webhooks (Beta)
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/clickuptrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ClickUpTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	team: string | Expression<string>;
	events: Array<
		| '*'
		| 'folderCreated'
		| 'folderDeleted'
		| 'folderUpdated'
		| 'goalCreated'
		| 'goalDeleted'
		| 'goalUpdated'
		| 'keyResultCreated'
		| 'keyResultDelete'
		| 'keyResultUpdated'
		| 'listCreated'
		| 'listDeleted'
		| 'listUpdated'
		| 'spaceCreated'
		| 'spaceDeleted'
		| 'spaceUpdated'
		| 'taskAssigneeUpdated'
		| 'taskCommentPosted'
		| 'taskCommentUpdated'
		| 'taskCreated'
		| 'taskDeleted'
		| 'taskDueDateUpdated'
		| 'taskMoved'
		| 'taskStatusUpdated'
		| 'taskTagUpdated'
		| 'taskTimeEstimateUpdated'
		| 'taskTimeTrackedUpdated'
		| 'taskUpdated'
	>;
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
// Node Type
// ===========================================================================

export type ClickUpTriggerNode = {
	type: 'n8n-nodes-base.clickUpTrigger';
	version: 1;
	config: NodeConfig<ClickUpTriggerV1Params>;
	credentials?: ClickUpTriggerV1Credentials;
	isTrigger: true;
};
