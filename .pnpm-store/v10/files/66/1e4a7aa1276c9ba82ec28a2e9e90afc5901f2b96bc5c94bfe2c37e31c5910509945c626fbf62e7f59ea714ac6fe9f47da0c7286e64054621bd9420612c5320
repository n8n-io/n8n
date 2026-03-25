/**
 * A "release tag" is a custom TSDoc tag that is applied to an API to communicate the level of support
 * provided for third-party developers.
 *
 * @remarks
 *
 * The four release tags are: `@internal`, `@alpha`, `@beta`, and `@public`. They are applied to API items such
 * as classes, member functions, enums, etc.  The release tag applies recursively to members of a container
 * (e.g. class or interface). For example, if a class is marked as `@beta`, then all of its members automatically
 * have this status; you DON'T need add the `@beta` tag to each member function. However, you could add
 * `@internal` to a member function to give it a different release status.
 *
 * @public
 */
export declare enum ReleaseTag {
    /**
     * No release tag was specified in the AEDoc summary.
     */
    None = 0,
    /**
     * Indicates that an API item is meant only for usage by other NPM packages from the same
     * maintainer. Third parties should never use "internal" APIs. (To emphasize this, their
     * names are prefixed by underscores.)
     */
    Internal = 1,
    /**
     * Indicates that an API item is eventually intended to be public, but currently is in an
     * early stage of development. Third parties should not use "alpha" APIs.
     */
    Alpha = 2,
    /**
     * Indicates that an API item has been released in an experimental state. Third parties are
     * encouraged to try it and provide feedback. However, a "beta" API should NOT be used
     * in production.
     */
    Beta = 3,
    /**
     * Indicates that an API item has been officially released. It is part of the supported
     * contract (e.g. SemVer) for a package.
     */
    Public = 4
}
/**
 * Helper functions for working with the `ReleaseTag` enum.
 * @public
 */
export declare namespace ReleaseTag {
    /**
     * Returns the TSDoc tag name for a `ReleaseTag` value.
     *
     * @remarks
     * For example, `getTagName(ReleaseTag.Internal)` would return the string `@internal`.
     */
    function getTagName(releaseTag: ReleaseTag): string;
    /**
     * Compares two `ReleaseTag` values. Their values must not be `ReleaseTag.None`.
     * @returns 0 if `a` and `b` are equal, a positive number if `a` is more public than `b`,
     * and a negative number if `a` is less public than `b`.
     * @remarks
     * For example, `compareReleaseTag(ReleaseTag.Beta, ReleaseTag.Alpha)` will return a positive
     * number because beta is more public than alpha.
     */
    function compare(a: ReleaseTag, b: ReleaseTag): number;
}
//# sourceMappingURL=ReleaseTag.d.ts.map