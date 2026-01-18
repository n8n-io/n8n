/**
 * Jira Trigger Node - Version 1
 * Starts the workflow when Jira events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface JiraTriggerV1Params {
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * If authentication should be activated for the webhook (makes it more secure)
 * @default none
 */
		incomingAuthentication?: 'queryAuth' | 'none' | Expression<string>;
/**
 * The events to listen to
 * @default []
 */
		events: Array<'*' | 'board_configuration_changed' | 'board_created' | 'board_deleted' | 'board_updated' | 'comment_created' | 'comment_deleted' | 'comment_updated' | 'jira:issue_created' | 'jira:issue_deleted' | 'issuelink_created' | 'issuelink_deleted' | 'jira:issue_updated' | 'option_attachments_changed' | 'option_issuelinks_changed' | 'option_subtasks_changed' | 'option_timetracking_changed' | 'option_unassigned_issues_changed' | 'option_voting_changed' | 'option_watching_changed' | 'project_created' | 'project_deleted' | 'project_updated' | 'sprint_closed' | 'sprint_created' | 'sprint_deleted' | 'sprint_started' | 'sprint_updated' | 'user_created' | 'user_deleted' | 'user_updated' | 'jira:version_created' | 'jira:version_deleted' | 'jira:version_moved' | 'jira:version_released' | 'jira:version_unreleased' | 'jira:version_updated' | 'worklog_created' | 'worklog_deleted' | 'worklog_updated'>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface JiraTriggerV1Credentials {
	jiraSoftwareCloudApi: CredentialReference;
	jiraSoftwareServerApi: CredentialReference;
	jiraSoftwareServerPatApi: CredentialReference;
	httpQueryAuth?: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type JiraTriggerV1Node = {
	type: 'n8n-nodes-base.jiraTrigger';
	version: 1;
	config: NodeConfig<JiraTriggerV1Params>;
	credentials?: JiraTriggerV1Credentials;
	isTrigger: true;
};