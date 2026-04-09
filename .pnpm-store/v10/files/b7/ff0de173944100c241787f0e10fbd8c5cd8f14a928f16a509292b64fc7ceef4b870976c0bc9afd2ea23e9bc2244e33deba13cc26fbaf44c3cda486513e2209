// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as ts from 'typescript';
import { ExtractorMessageId } from '../api/ExtractorMessageId';
export class PackageDocComment {
    /**
     * For the given source file, see if it starts with a TSDoc comment containing the `@packageDocumentation` tag.
     */
    static tryFindInSourceFile(sourceFile, collector) {
        // The @packageDocumentation comment is special because it is not attached to an AST
        // definition.  Instead, it is part of the "trivia" tokens that the compiler treats
        // as irrelevant white space.
        //
        // WARNING: If the comment doesn't precede an export statement, the compiler will omit
        // it from the *.d.ts file, and API Extractor won't find it.  If this happens, you need
        // to rearrange your statements to ensure it is passed through.
        //
        // This implementation assumes that the "@packageDocumentation" will be in the first TSDoc comment
        // that appears in the entry point *.d.ts file.  We could possibly look in other places,
        // but the above warning suggests enforcing a standardized layout.  This design choice is open
        // to feedback.
        let packageCommentRange = undefined; // empty string
        for (const commentRange of ts.getLeadingCommentRanges(sourceFile.text, sourceFile.getFullStart()) || []) {
            if (commentRange.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
                const commentBody = sourceFile.text.substring(commentRange.pos, commentRange.end);
                // Choose the first JSDoc-style comment
                if (/^\s*\/\*\*/.test(commentBody)) {
                    // But only if it looks like it's trying to be @packageDocumentation
                    // (The TSDoc parser will validate this more rigorously)
                    if (/\@packageDocumentation/i.test(commentBody)) {
                        packageCommentRange = commentRange;
                    }
                    break;
                }
            }
        }
        if (!packageCommentRange) {
            // If we didn't find the @packageDocumentation tag in the expected place, is it in some
            // wrong place?  This sanity check helps people to figure out why there comment isn't working.
            for (const statement of sourceFile.statements) {
                const ranges = [];
                ranges.push(...(ts.getLeadingCommentRanges(sourceFile.text, statement.getFullStart()) || []));
                ranges.push(...(ts.getTrailingCommentRanges(sourceFile.text, statement.getEnd()) || []));
                for (const commentRange of ranges) {
                    const commentBody = sourceFile.text.substring(commentRange.pos, commentRange.end);
                    if (/\@packageDocumentation/i.test(commentBody)) {
                        collector.messageRouter.addAnalyzerIssueForPosition(ExtractorMessageId.MisplacedPackageTag, 'The @packageDocumentation comment must appear at the top of entry point *.d.ts file', sourceFile, commentRange.pos);
                        break;
                    }
                }
            }
        }
        return packageCommentRange;
    }
}
//# sourceMappingURL=PackageDocComment.js.map