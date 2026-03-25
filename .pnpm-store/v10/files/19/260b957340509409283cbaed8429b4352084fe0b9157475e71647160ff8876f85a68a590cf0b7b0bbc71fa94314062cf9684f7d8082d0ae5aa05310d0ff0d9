/**
 * Helpers for validating various text string formats.
 */
export declare class StringChecks {
    private static readonly _tsdocTagNameRegExp;
    private static readonly _urlSchemeRegExp;
    private static readonly _urlSchemeAfterRegExp;
    private static readonly _htmlNameRegExp;
    private static readonly _identifierBadCharRegExp;
    private static readonly _identifierNumberStartRegExp;
    private static readonly _validPackageNameRegExp;
    private static readonly _systemSelectors;
    /**
     * Tests whether the input string is a valid TSDoc tag name; if not, returns an error message.
     * TSDoc tag names start with an at-sign ("@") followed by ASCII letters using
     * "camelCase" capitalization.
     */
    static explainIfInvalidTSDocTagName(tagName: string): string | undefined;
    /**
     * Throws an exception if the input string is not a valid TSDoc tag name.
     * TSDoc tag names start with an at-sign ("@") followed by ASCII letters using
     * "camelCase" capitalization.
     */
    static validateTSDocTagName(tagName: string): void;
    /**
     * Tests whether the input string is a URL form supported inside an "@link" tag; if not,
     * returns an error message.
     */
    static explainIfInvalidLinkUrl(url: string): string | undefined;
    /**
     * Tests whether the input string is a valid HTML element or attribute name.
     */
    static explainIfInvalidHtmlName(htmlName: string): string | undefined;
    /**
     * Throws an exception if the input string is a not valid HTML element or attribute name.
     */
    static validateHtmlName(htmlName: string): void;
    /**
     * Tests whether the input string is a valid NPM package name.
     */
    static explainIfInvalidPackageName(packageName: string): string | undefined;
    /**
     * Tests whether the input string is a valid declaration reference import path.
     */
    static explainIfInvalidImportPath(importPath: string, prefixedByPackageName: boolean): string | undefined;
    /**
     * Returns true if the input string is a TSDoc system selector.
     */
    static isSystemSelector(selector: string): boolean;
    /**
     * Tests whether the input string is a valid ECMAScript identifier.
     * A precise check is extremely complicated and highly dependent on the standard version
     * and how faithfully the interpreter implements it, so here we use a conservative heuristic.
     */
    static explainIfInvalidUnquotedIdentifier(identifier: string): string | undefined;
    /**
     * Tests whether the input string can be used without quotes as a member identifier in a declaration reference.
     * If not, it should be enclosed in quotes.
     */
    static explainIfInvalidUnquotedMemberIdentifier(identifier: string): string | undefined;
}
//# sourceMappingURL=StringChecks.d.ts.map