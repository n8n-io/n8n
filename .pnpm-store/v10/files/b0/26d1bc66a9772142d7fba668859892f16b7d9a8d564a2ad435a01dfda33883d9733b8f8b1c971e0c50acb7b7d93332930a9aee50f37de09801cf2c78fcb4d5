"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntaxHelpers = void 0;
const ts = __importStar(require("typescript"));
/**
 * Helpers for validating various text string formats.
 */
class SyntaxHelpers {
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
exports.SyntaxHelpers = SyntaxHelpers;
//# sourceMappingURL=SyntaxHelpers.js.map