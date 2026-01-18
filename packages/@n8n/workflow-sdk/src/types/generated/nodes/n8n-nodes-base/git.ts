/**
 * Git Node Types
 *
 * Control git.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/git/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GitV11Params {
	/**
	 * The way to authenticate
	 * @default none
	 */
	authentication?: 'gitPassword' | 'none' | Expression<string>;
	operation?:
		| 'add'
		| 'addConfig'
		| 'clone'
		| 'commit'
		| 'fetch'
		| 'listConfig'
		| 'log'
		| 'pull'
		| 'push'
		| 'pushTags'
		| 'reflog'
		| 'status'
		| 'switchBranch'
		| 'tag'
		| 'userSetup'
		| Expression<string>;
	/**
	 * Local path of the git repository to operate on
	 */
	repositoryPath: string | Expression<string>;
	/**
	 * Comma-separated list of paths (absolute or relative to Repository Path) of files or folders to add
	 */
	pathsToAdd: string | Expression<string>;
	/**
	 * Name of the key to set
	 */
	key: 'user.email' | 'user.name' | 'remote.origin.url' | Expression<string>;
	/**
	 * Value of the key to set
	 */
	value: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The URL or path of the repository to clone
	 */
	sourceRepository: string | Expression<string>;
	/**
	 * The commit message to use
	 */
	message?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * The name of the branch to switch to
	 */
	branchName: string | Expression<string>;
	/**
	 * The name of the tag to create
	 */
	name: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GitV11Credentials {
	gitPassword: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GitV11Node = {
	type: 'n8n-nodes-base.git';
	version: 1 | 1.1;
	config: NodeConfig<GitV11Params>;
	credentials?: GitV11Credentials;
};

export type GitNode = GitV11Node;
