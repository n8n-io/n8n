// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as ts from 'typescript';
/**
 * Helpers for validating various text string formats.
 */
export class SyntaxHelpers {
    /**
     * Tests whether the input string is safe to use as an ECMAScript identifier without quotes.
     *
     * @remarks
     * For example:
     *
     * ```ts
     * class X {
     *   public okay: number = 1;
     *   public "not okay!": number = 2;
     * }
     * ```
     *
     * A precise check is extremely complicated and highly dependent on the ECMAScript standard version
     * and how faithfully the interpreter implements it.  To keep things simple, `isSafeUnquotedMemberIdentifier()`
     * conservatively accepts any identifier that would be valid with ECMAScript 5, and returns false otherwise.
     */
    static isSafeUnquotedMemberIdentifier(identifier) {
        if (identifier.length === 0) {
            return false; // cannot be empty
        }
        if (!ts.isIdentifierStart(identifier.charCodeAt(0), ts.ScriptTarget.ES5)) {
            return false;
        }
        for (let i = 1; i < identifier.length; i++) {
            if (!ts.isIdentifierPart(identifier.charCodeAt(i), ts.ScriptTarget.ES5)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Given an arbitrary input string, return a regular TypeScript identifier name.
     *
     * @remarks
     * Example input:  "api-extractor-lib1-test"
     * Example output: "apiExtractorLib1Test"
     */
    static makeCamelCaseIdentifier(input) {
        const parts = input.split(/\W+/).filter((x) => x.length > 0);
        if (parts.length === 0) {
            return '_';
        }
        for (let i = 0; i < parts.length; ++i) {
            let part = parts[i];
            if (part.toUpperCase() === part) {
                // Preserve existing case unless the part is all upper-case
                part = part.toLowerCase();
            }
            if (i === 0) {
                // If the first part starts with a number, prepend "_"
                if (/[0-9]/.test(part.charAt(0))) {
                    part = '_' + part;
                }
            }
            else {
                // Capitalize the first letter of each part, except for the first one
                part = part.charAt(0).toUpperCase() + part.slice(1);
            }
            parts[i] = part;
        }
        return parts.join('');
    }
}
//# sourceMappingURL=SyntaxHelpers.js.map