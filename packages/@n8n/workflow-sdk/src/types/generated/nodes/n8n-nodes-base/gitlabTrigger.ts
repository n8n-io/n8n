/**
 * GitLab Trigger Node Types
 *
 * Starts the workflow when GitLab events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/gitlabtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GitlabTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
	/**
	 * Owner of the repository
	 */
	owner: string | Expression<string>;
	/**
	 * The name of the repository
	 */
	repository: string | Expression<string>;
	/**
	 * The events to listen to
	 * @default []
	 */
	events: Array<
		| 'note'
		| 'confidential_issues'
		| 'confidential_note'
		| 'deployment'
		| 'issues'
		| 'job'
		| 'merge_requests'
		| 'pipeline'
		| 'push'
		| 'releases'
		| 'tag_push'
		| 'wiki_page'
		| '*'
	>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GitlabTriggerV1Credentials {
	gitlabApi: CredentialReference;
	gitlabOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GitlabTriggerNode = {
	type: 'n8n-nodes-base.gitlabTrigger';
	version: 1;
	config: NodeConfig<GitlabTriggerV1Params>;
	credentials?: GitlabTriggerV1Credentials;
	isTrigger: true;
};
