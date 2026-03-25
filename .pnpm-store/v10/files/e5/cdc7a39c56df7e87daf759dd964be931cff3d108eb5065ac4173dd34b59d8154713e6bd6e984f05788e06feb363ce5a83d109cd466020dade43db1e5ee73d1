"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseTag = void 0;
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
var ReleaseTag;
(function (ReleaseTag) {
    /**
     * No release tag was specified in the AEDoc summary.
     */
    ReleaseTag[ReleaseTag["None"] = 0] = "None";
    /**
     * Indicates that an API item is meant only for usage by other NPM packages from the same
     * maintainer. Third parties should never use "internal" APIs. (To emphasize this, their
     * names are prefixed by underscores.)
     */
    ReleaseTag[ReleaseTag["Internal"] = 1] = "Internal";
    /**
     * Indicates that an API item is eventually intended to be public, but currently is in an
     * early stage of development. Third parties should not use "alpha" APIs.
     */
    ReleaseTag[ReleaseTag["Alpha"] = 2] = "Alpha";
    /**
     * Indicates that an API item has been released in an experimental state. Third parties are
     * encouraged to try it and provide feedback. However, a "beta" API should NOT be used
     * in production.
     */
    ReleaseTag[ReleaseTag["Beta"] = 3] = "Beta";
    /**
     * Indicates that an API item has been officially released. It is part of the supported
     * contract (e.g. SemVer) for a package.
     */
    ReleaseTag[ReleaseTag["Public"] = 4] = "Public";
})(ReleaseTag || (exports.ReleaseTag = ReleaseTag = {}));
/**
 * Helper functions for working with the `ReleaseTag` enum.
 * @public
 */
(function (ReleaseTag) {
    /**
     * Returns the TSDoc tag name for a `ReleaseTag` value.
     *
     * @remarks
     * For example, `getTagName(ReleaseTag.Internal)` would return the string `@internal`.
     */
    function getTagName(releaseTag) {
        switch (releaseTag) {
            case ReleaseTag.None:
                return '(none)';
            case ReleaseTag.Internal:
                return '@internal';
            case ReleaseTag.Alpha:
                return '@alpha';
            case ReleaseTag.Beta:
                return '@beta';
            case ReleaseTag.Public:
                return '@public';
            default:
                throw new Error('Unsupported release tag');
        }
    }
    ReleaseTag.getTagName = getTagName;
    /**
     * Compares two `ReleaseTag` values. Their values must not be `ReleaseTag.None`.
     * @returns 0 if `a` and `b` are equal, a positive number if `a` is more public than `b`,
     * and a negative number if `a` is less public than `b`.
     * @remarks
     * For example, `compareReleaseTag(ReleaseTag.Beta, ReleaseTag.Alpha)` will return a positive
     * number because beta is more public than alpha.
     */
    function compare(a, b) {
        return a - b;
    }
    ReleaseTag.compare = compare;
})(ReleaseTag || (exports.ReleaseTag = ReleaseTag = {}));
//# sourceMappingURL=ReleaseTag.js.map