/**
 * GitLab Trigger Node - Version 1
 * Starts the workflow when GitLab events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
		events: Array<'note' | 'confidential_issues' | 'confidential_note' | 'deployment' | 'issues' | 'job' | 'merge_requests' | 'pipeline' | 'push' | 'releases' | 'tag_push' | 'wiki_page' | '*'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GitlabTriggerV1Credentials {
	gitlabApi: CredentialReference;
	gitlabOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GitlabTriggerV1NodeBase {
	type: 'n8n-nodes-base.gitlabTrigger';
	version: 1;
	credentials?: GitlabTriggerV1Credentials;
	isTrigger: true;
}

export type GitlabTriggerV1ParamsNode = GitlabTriggerV1NodeBase & {
	config: NodeConfig<GitlabTriggerV1Params>;
};

export type GitlabTriggerV1Node = GitlabTriggerV1ParamsNode;