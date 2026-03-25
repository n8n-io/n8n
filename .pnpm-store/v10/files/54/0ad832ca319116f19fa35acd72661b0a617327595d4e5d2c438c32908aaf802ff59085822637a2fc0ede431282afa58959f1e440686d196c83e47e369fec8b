/**
 * The ScopeSet class creates a set of scopes. Scopes are case-insensitive, unique values, so the Set object in JS makes
 * the most sense to implement for this class. All scopes are trimmed and converted to lower case strings in intersection and union functions
 * to ensure uniqueness of strings.
 */
export declare class ScopeSet {
    private scopes;
    constructor(inputScopes: Array<string>);
    /**
     * Factory method to create ScopeSet from space-delimited string
     * @param inputScopeString
     * @param appClientId
     * @param scopesRequired
     */
    static fromString(inputScopeString: string): ScopeSet;
    /**
     * Creates the set of scopes to search for in cache lookups
     * @param inputScopeString
     * @returns
     */
    static createSearchScopes(inputScopeString: Array<string>): ScopeSet;
    /**
     * Check if a given scope is present in this set of scopes.
     * @param scope
     */
    containsScope(scope: string): boolean;
    /**
     * Check if a set of scopes is present in this set of scopes.
     * @param scopeSet
     */
    containsScopeSet(scopeSet: ScopeSet): boolean;
    /**
     * Check if set of scopes contains only the defaults
     */
    containsOnlyOIDCScopes(): boolean;
    /**
     * Appends single scope if passed
     * @param newScope
     */
    appendScope(newScope: string): void;
    /**
     * Appends multiple scopes if passed
     * @param newScopes
     */
    appendScopes(newScopes: Array<string>): void;
    /**
     * Removes element from set of scopes.
     * @param scope
     */
    removeScope(scope: string): void;
    /**
     * Removes default scopes from set of scopes
     * Primarily used to prevent cache misses if the default scopes are not returned from the server
     */
    removeOIDCScopes(): void;
    /**
     * Combines an array of scopes with the current set of scopes.
     * @param otherScopes
     */
    unionScopeSets(otherScopes: ScopeSet): Set<string>;
    /**
     * Check if scopes intersect between this set and another.
     * @param otherScopes
     */
    intersectingScopeSets(otherScopes: ScopeSet): boolean;
    /**
     * Returns size of set of scopes.
     */
    getScopeCount(): number;
    /**
     * Returns the scopes as an array of string values
     */
    asArray(): Array<string>;
    /**
     * Prints scopes into a space-delimited string
     */
    printScopes(): string;
    /**
     * Prints scopes into a space-delimited lower-case string (used for caching)
     */
    printScopesLowerCase(): string;
}
//# sourceMappingURL=ScopeSet.d.ts.map