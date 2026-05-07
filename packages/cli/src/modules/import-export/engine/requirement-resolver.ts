/**
 * A strategy for resolving a single package requirement to an existing
 * entity on the target instance.
 *
 * Implementations are pluggable — the BindingResolver iterates a list
 * of requirements and delegates to the appropriate resolver.
 */
export interface RequirementResolver<TRequirement> {
	/**
	 * Try to find a matching entity on the target instance.
	 * @returns The target entity ID if found, or null if unresolved.
	 */
	resolve(requirement: TRequirement, context: ResolveContext): Promise<string | null>;
}

export interface ResolveContext {
	targetProjectId?: string;
}
