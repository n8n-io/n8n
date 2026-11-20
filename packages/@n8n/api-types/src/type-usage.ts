/** How often the running version of non-archived workflows uses one type. */
export type TypeUsage = {
	/**
	 * Nodes that use the type. A node uses a node type when it is of that type. A node uses a
	 * credential type when it selects a credential of it.
	 */
	uses: number;
	workflows: number;
	activeWorkflows: number;
	/** Projects that own at least one of these workflows. */
	projects: number;
};

/**
 * Response of `GET /credential-type-policies/usage` and
 * `GET /projects/:projectId/credential-type-policies/usage`, keyed by credential type.
 * A type with no entry has no usage.
 */
export type CredentialTypeUsageResponse = Record<string, TypeUsage>;

/**
 * Response of `GET /node-type-policies/usage` and
 * `GET /projects/:projectId/node-type-policies/usage`, keyed by node type.
 * A type with no entry has no usage.
 *
 * The entry of a node type also counts the tool variants that n8n generates from it, such as
 * `gmailTool`, because a `name` rule on the node type also matches them. Each variant also has
 * an entry of its own.
 */
export type NodeTypeUsageResponse = Record<string, TypeUsage>;
