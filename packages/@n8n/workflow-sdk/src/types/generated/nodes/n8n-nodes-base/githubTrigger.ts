/**
 * Github Trigger Node Types
 *
 * Starts the workflow when Github events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/githubtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface GithubTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
	owner: ResourceLocatorValue;
	repository: ResourceLocatorValue;
	/**
	 * The events to listen to
	 * @default []
	 */
	events: Array<
		| '*'
		| 'check_run'
		| 'check_suite'
		| 'commit_comment'
		| 'create'
		| 'delete'
		| 'deploy_key'
		| 'deployment'
		| 'deployment_status'
		| 'fork'
		| 'github_app_authorization'
		| 'gollum'
		| 'installation'
		| 'installation_repositories'
		| 'issue_comment'
		| 'issues'
		| 'label'
		| 'marketplace_purchase'
		| 'member'
		| 'membership'
		| 'meta'
		| 'milestone'
		| 'org_block'
		| 'organization'
		| 'page_build'
		| 'project'
		| 'project_card'
		| 'project_column'
		| 'public'
		| 'pull_request'
		| 'pull_request_review'
		| 'pull_request_review_comment'
		| 'push'
		| 'release'
		| 'repository'
		| 'repository_import'
		| 'repository_vulnerability_alert'
		| 'security_advisory'
		| 'star'
		| 'status'
		| 'team'
		| 'team_add'
		| 'watch'
	>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GithubTriggerV1Credentials {
	githubApi: CredentialReference;
	githubOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GithubTriggerNode = {
	type: 'n8n-nodes-base.githubTrigger';
	version: 1;
	config: NodeConfig<GithubTriggerV1Params>;
	credentials?: GithubTriggerV1Credentials;
	isTrigger: true;
};
