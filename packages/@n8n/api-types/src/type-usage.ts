/** How often the running version of non-archived workflows uses one type. */
export type TypeUsage = {
	/** Nodes that use the type. */
	uses: number;
	workflows: number;
	activeWorkflows: number;
};

/**
 * Response of `GET /credential-type-policies/usage` and
 * `GET /projects/:projectId/credential-type-policies/usage`, keyed by credential type.
 * A type with no entry has no usage.
 */
export type CredentialTypeUsageResponse = Record<string, TypeUsage>;
