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
	 * @displayOptions.show { operation: ["clone", "push"] }
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
	 * @displayOptions.hide { operation: ["clone"] }
	 */
	repositoryPath: string | Expression<string>;
	/**
	 * Comma-separated list of paths (absolute or relative to Repository Path) of files or folders to add
	 * @displayOptions.show { operation: ["add"] }
	 */
	pathsToAdd: string | Expression<string>;
	/**
	 * Name of the key to set
	 * @displayOptions.show { operation: ["addConfig"], @version: [{"_cnd":{"gte":1.1}}] }
	 */
	key: 'user.email' | 'user.name' | 'remote.origin.url' | Expression<string>;
	/**
	 * Value of the key to set
	 * @displayOptions.show { operation: ["addConfig"] }
	 */
	value: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The URL or path of the repository to clone
	 * @displayOptions.show { operation: ["clone"] }
	 */
	sourceRepository: string | Expression<string>;
	/**
	 * The commit message to use
	 * @displayOptions.show { operation: ["commit"] }
	 */
	message?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["log"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["log"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * The name of the branch to switch to
	 * @displayOptions.show { operation: ["switchBranch"] }
	 */
	branchName: string | Expression<string>;
	/**
	 * The name of the tag to create
	 * @displayOptions.show { operation: ["tag"] }
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
