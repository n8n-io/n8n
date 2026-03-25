"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringChecks = void 0;
/**
 * Helpers for validating various text string formats.
 */
var StringChecks = /** @class */ (function () {
    function StringChecks() {
    }
    /**
     * Tests whether the input string is a valid TSDoc tag name; if not, returns an error message.
     * TSDoc tag names start with an at-sign ("@") followed by ASCII letters using
     * "camelCase" capitalization.
     */
    StringChecks.explainIfInvalidTSDocTagName = function (tagName) {
        if (tagName[0] !== '@') {
            return 'A TSDoc tag name must start with an "@" symbol';
        }
        if (!StringChecks._tsdocTagNameRegExp.test(tagName)) {
            return 'A TSDoc tag name must start with a letter and contain only letters and numbers';
        }
        return undefined;
    };
    /**
     * Throws an exception if the input string is not a valid TSDoc tag name.
     * TSDoc tag names start with an at-sign ("@") followed by ASCII letters using
     * "camelCase" capitalization.
     */
    StringChecks.validateTSDocTagName = function (tagName) {
        var explanation = StringChecks.explainIfInvalidTSDocTagName(tagName);
        if (explanation) {
            throw new Error(explanation);
        }
    };
    /**
     * Tests whether the input string is a URL form supported inside an "@link" tag; if not,
     * returns an error message.
     */
    StringChecks.explainIfInvalidLinkUrl = function (url) {
        if (url.length === 0) {
            return 'The URL cannot be empty';
        }
        if (!StringChecks._urlSchemeRegExp.test(url)) {
            return ('An @link URL must begin with a scheme comprised only of letters and numbers followed by "://".' +
                ' (For general URLs, use an HTML "<a>" tag instead.)');
        }
        if (!StringChecks._urlSchemeAfterRegExp.test(url)) {
            return 'An @link URL must have at least one character after "://"';
        }
        return undefined;
    };
    /**
     * Tests whether the input string is a valid HTML element or attribute name.
     */
    StringChecks.explainIfInvalidHtmlName = function (htmlName) {
        if (!StringChecks._htmlNameRegExp.test(htmlName)) {
            return 'An HTML name must be an ASCII letter followed by zero or more letters, digits, or hyphens';
        }
        return undefined;
    };
    /**
     * Throws an exception if the input string is a not valid HTML element or attribute name.
     */
    StringChecks.validateHtmlName = function (htmlName) {
        var explanation = StringChecks.explainIfInvalidHtmlName(htmlName);
        if (explanation) {
            throw new Error(explanation);
        }
    };
    /**
     * Tests whether the input string is a valid NPM package name.
     */
    StringChecks.explainIfInvalidPackageName = function (packageName) {
        if (packageName.length === 0) {
            return 'The package name cannot be an empty string';
        }
        if (!StringChecks._validPackageNameRegExp.test(packageName)) {
            return "The package name ".concat(JSON.stringify(packageName), " is not a valid package name");
        }
        return undefined;
    };
    /**
     * Tests whether the input string is a valid declaration reference import path.
     */
    StringChecks.explainIfInvalidImportPath = function (importPath, prefixedByPackageName) {
        if (importPath.length > 0) {
            if (importPath.indexOf('//') >= 0) {
                return 'An import path must not contain "//"';
            }
            if (importPath[importPath.length - 1] === '/') {
                return 'An import path must not end with "/"';
            }
            if (!prefixedByPackageName) {
                if (importPath[0] === '/') {
                    return 'An import path must not start with "/" unless prefixed by a package name';
                }
            }
        }
        return undefined;
    };
    /**
     * Returns true if the input string is a TSDoc system selector.
     */
    StringChecks.isSystemSelector = function (selector) {
        return StringChecks._systemSelectors.has(selector);
    };
    /**
     * Tests whether the input string is a valid ECMAScript identifier.
     * A precise check is extremely complicated and highly dependent on the standard version
     * and how faithfully the interpreter implements it, so here we use a conservative heuristic.
     */
    StringChecks.explainIfInvalidUnquotedIdentifier = function (identifier) {
        if (identifier.length === 0) {
            return 'The identifier cannot be an empty string';
        }
        if (StringChecks._identifierBadCharRegExp.test(identifier)) {
            return 'The identifier cannot non-word characters';
        }
        if (StringChecks._identifierNumberStartRegExp.test(identifier)) {
            return 'The identifier must not start with a number';
        }
        return undefined;
    };
    /**
     * Tests whether the input string can be used without quotes as a member identifier in a declaration reference.
     * If not, it should be enclosed in quotes.
     */
    StringChecks.explainIfInvalidUnquotedMemberIdentifier = function (identifier) {
        var explanation = StringChecks.explainIfInvalidUnquotedIdentifier(identifier);
        if (explanation !== undefined) {
            return explanation;
        }
        if (StringChecks.isSystemSelector(identifier)) {
            // We do this to avoid confusion about the declaration reference syntax rules.
            // For example if someone were to see "MyClass.(static:instance)" it would be unclear which
            // side the colon is the selector.
            return "The identifier \"".concat(identifier, "\" must be quoted because it is a TSDoc system selector name");
        }
        return undefined;
    };
    StringChecks._tsdocTagNameRegExp = /^@[a-z][a-z0-9]*$/i;
    StringChecks._urlSchemeRegExp = /^[a-z][a-z0-9]*\:\/\//i;
    StringChecks._urlSchemeAfterRegExp = /^[a-z][a-z0-9]*\:\/\/./i;
    // HTML element definitions:
    // https://spec.commonmark.org/0.29/#tag-name
    // https://www.w3.org/TR/html5/syntax.html#tag-name
    // https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
    //
    // We use the CommonMark spec:
    // "A tag name consists of an ASCII letter followed by zero or more ASCII letters, digits, or hyphens (-)."
    StringChecks._htmlNameRegExp = /^[a-z]+[a-z0-9\-]*$/i;
    // Note: In addition to letters, numbers, underscores, and dollar signs, modern ECMAScript
    // also allows Unicode categories such as letters, combining marks, digits, and connector punctuation.
    // These are mostly supported in all environments except IE11, so if someone wants it, we would accept
    // a PR to allow them (although the test surface might be somewhat large).
    StringChecks._identifierBadCharRegExp = /[^a-z0-9_$]/i;
    // Identifiers most not start with a number.
    StringChecks._identifierNumberStartRegExp = /^[0-9]/;
    // For detailed notes about NPM package name syntax, see:
    // tslint:disable-next-line:max-line-length
    // https://github.com/Microsoft/web-build-tools/blob/a417ca25c63aca31dba43a34d39cc9cd529b9c78/libraries/node-core-library/src/PackageName.ts
    StringChecks._validPackageNameRegExp = /^(?:@[a-z0-9\-_\.]+\/)?[a-z0-9\-_\.]+$/i;
    StringChecks._systemSelectors = new Set([
        // For classes:
        'instance',
        'static',
        'constructor',
        // For merged declarations:
        'class',
        'enum',
        'function',
        'interface',
        'namespace',
        'type',
        'variable'
    ]);
    return StringChecks;
}());
exports.StringChecks = StringChecks;
//# sourceMappingURL=StringChecks.js.map