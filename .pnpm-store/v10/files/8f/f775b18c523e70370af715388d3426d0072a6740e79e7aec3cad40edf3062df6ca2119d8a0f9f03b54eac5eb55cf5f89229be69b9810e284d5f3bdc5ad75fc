import { type DocNode } from '../../nodes';
import { TokenSequence } from '../TokenSequence';
import type { ParserContext } from '../ParserContext';
/**
 * The TokenCoverageChecker performs two diagnostics to detect parser bugs:
 * 1. It checks for two DocNode objects whose excerpt contains overlapping tokens.
 *    By design, a single character from the input stream should be associated with
 *    at most one TokenSequence.
 * 2. It checks for gaps, i.e. input tokens that were not associated with any DocNode
 *    (that is reachable from the final DocCommon node tree).  In some cases this is
 *    okay.  For example, if `@public` appears twice inside a comment, the second
 *    redundant instance is ignored.  But in general we want to track the gaps in the
 *    unit test snapshots to ensure in general that every input character is associated
 *    with an excerpt for a DocNode.
 */
export declare class TokenCoverageChecker {
    private readonly _parserContext;
    private readonly _tokenAssociations;
    constructor(parserContext: ParserContext);
    getGaps(rootNode: DocNode): TokenSequence[];
    reportGaps(rootNode: DocNode): void;
    private _addNodeTree;
    private _addSequence;
    private _checkForGaps;
    private _reportGap;
    private _formatTokenAssociation;
}
//# sourceMappingURL=TokenCoverageChecker.d.ts.map