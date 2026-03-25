/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    createClientConfigurationError,
    ClientConfigurationErrorCodes,
} from "../error/ClientConfigurationError.js";
import { StringUtils } from "../utils/StringUtils.js";
import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "../error/ClientAuthError.js";
import {
    Constants,
    OIDC_SCOPES,
    OIDC_DEFAULT_SCOPES,
} from "../utils/Constants.js";

/**
 * The ScopeSet class creates a set of scopes. Scopes are case-insensitive, unique values, so the Set object in JS makes
 * the most sense to implement for this class. All scopes are trimmed and converted to lower case strings in intersection and union functions
 * to ensure uniqueness of strings.
 */
export class ScopeSet {
    // Scopes as a Set of strings
    private scopes: Set<string>;

    constructor(inputScopes: Array<string>) {
        // Filter empty string and null/undefined array items
        const scopeArr = inputScopes
            ? StringUtils.trimArrayEntries([...inputScopes])
            : [];
        const filteredInput = scopeArr
            ? StringUtils.removeEmptyStringsFromArray(scopeArr)
            : [];

        // Check if scopes array has at least one member
        if (!filteredInput || !filteredInput.length) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.emptyInputScopesError
            );
        }

        this.scopes = new Set<string>(); // Iterator in constructor not supported by IE11
        filteredInput.forEach((scope) => this.scopes.add(scope));
    }

    /**
     * Factory method to create ScopeSet from space-delimited string
     * @param inputScopeString
     * @param appClientId
     * @param scopesRequired
     */
    static fromString(inputScopeString: string): ScopeSet {
        const scopeString = inputScopeString || Constants.EMPTY_STRING;
        const inputScopes: Array<string> = scopeString.split(" ");
        return new ScopeSet(inputScopes);
    }

    /**
     * Creates the set of scopes to search for in cache lookups
     * @param inputScopeString
     * @returns
     */
    static createSearchScopes(inputScopeString: Array<string>): ScopeSet {
        // Handle empty scopes by using default OIDC scopes for cache lookup
        const scopesToUse =
            inputScopeString && inputScopeString.length > 0
                ? inputScopeString
                : [...OIDC_DEFAULT_SCOPES];

        const scopeSet = new ScopeSet(scopesToUse);
        if (!scopeSet.containsOnlyOIDCScopes()) {
            scopeSet.removeOIDCScopes();
        } else {
            scopeSet.removeScope(Constants.OFFLINE_ACCESS_SCOPE);
        }

        return scopeSet;
    }

    /**
     * Check if a given scope is present in this set of scopes.
     * @param scope
     */
    containsScope(scope: string): boolean {
        const lowerCaseScopes = this.printScopesLowerCase().split(" ");
        const lowerCaseScopesSet = new ScopeSet(lowerCaseScopes);
        // compare lowercase scopes
        return scope
            ? lowerCaseScopesSet.scopes.has(scope.toLowerCase())
            : false;
    }

    /**
     * Check if a set of scopes is present in this set of scopes.
     * @param scopeSet
     */
    containsScopeSet(scopeSet: ScopeSet): boolean {
        if (!scopeSet || scopeSet.scopes.size <= 0) {
            return false;
        }

        return (
            this.scopes.size >= scopeSet.scopes.size &&
            scopeSet.asArray().every((scope) => this.containsScope(scope))
        );
    }

    /**
     * Check if set of scopes contains only the defaults
     */
    containsOnlyOIDCScopes(): boolean {
        let defaultScopeCount = 0;
        OIDC_SCOPES.forEach((defaultScope: string) => {
            if (this.containsScope(defaultScope)) {
                defaultScopeCount += 1;
            }
        });

        return this.scopes.size === defaultScopeCount;
    }

    /**
     * Appends single scope if passed
     * @param newScope
     */
    appendScope(newScope: string): void {
        if (newScope) {
            this.scopes.add(newScope.trim());
        }
    }

    /**
     * Appends multiple scopes if passed
     * @param newScopes
     */
    appendScopes(newScopes: Array<string>): void {
        try {
            newScopes.forEach((newScope) => this.appendScope(newScope));
        } catch (e) {
            throw createClientAuthError(
                ClientAuthErrorCodes.cannotAppendScopeSet
            );
        }
    }

    /**
     * Removes element from set of scopes.
     * @param scope
     */
    removeScope(scope: string): void {
        if (!scope) {
            throw createClientAuthError(
                ClientAuthErrorCodes.cannotRemoveEmptyScope
            );
        }
        this.scopes.delete(scope.trim());
    }

    /**
     * Removes default scopes from set of scopes
     * Primarily used to prevent cache misses if the default scopes are not returned from the server
     */
    removeOIDCScopes(): void {
        OIDC_SCOPES.forEach((defaultScope: string) => {
            this.scopes.delete(defaultScope);
        });
    }

    /**
     * Combines an array of scopes with the current set of scopes.
     * @param otherScopes
     */
    unionScopeSets(otherScopes: ScopeSet): Set<string> {
        if (!otherScopes) {
            throw createClientAuthError(
                ClientAuthErrorCodes.emptyInputScopeSet
            );
        }
        const unionScopes = new Set<string>(); // Iterator in constructor not supported in IE11
        otherScopes.scopes.forEach((scope) =>
            unionScopes.add(scope.toLowerCase())
        );
        this.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
        return unionScopes;
    }

    /**
     * Check if scopes intersect between this set and another.
     * @param otherScopes
     */
    intersectingScopeSets(otherScopes: ScopeSet): boolean {
        if (!otherScopes) {
            throw createClientAuthError(
                ClientAuthErrorCodes.emptyInputScopeSet
            );
        }

        // Do not allow OIDC scopes to be the only intersecting scopes
        if (!otherScopes.containsOnlyOIDCScopes()) {
            otherScopes.removeOIDCScopes();
        }
        const unionScopes = this.unionScopeSets(otherScopes);
        const sizeOtherScopes = otherScopes.getScopeCount();
        const sizeThisScopes = this.getScopeCount();
        const sizeUnionScopes = unionScopes.size;
        return sizeUnionScopes < sizeThisScopes + sizeOtherScopes;
    }

    /**
     * Returns size of set of scopes.
     */
    getScopeCount(): number {
        return this.scopes.size;
    }

    /**
     * Returns the scopes as an array of string values
     */
    asArray(): Array<string> {
        const array: Array<string> = [];
        this.scopes.forEach((val) => array.push(val));
        return array;
    }

    /**
     * Prints scopes into a space-delimited string
     */
    printScopes(): string {
        if (this.scopes) {
            const scopeArr = this.asArray();
            return scopeArr.join(" ");
        }
        return Constants.EMPTY_STRING;
    }

    /**
     * Prints scopes into a space-delimited lower-case string (used for caching)
     */
    printScopesLowerCase(): string {
        return this.printScopes().toLowerCase();
    }
}
