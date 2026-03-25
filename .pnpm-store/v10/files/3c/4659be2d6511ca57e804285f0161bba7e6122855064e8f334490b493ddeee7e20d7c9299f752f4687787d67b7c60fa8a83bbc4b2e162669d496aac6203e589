import type { TextRange } from '../TextRange';
import { type DocNode } from '../../nodes';
import type { ParserContext } from '../ParserContext';
import { TSDocConfiguration } from '../../configuration/TSDocConfiguration';
interface ISnapshotItem {
    kind: string;
    errorMessage?: string;
    errorLocation?: string;
    errorLocationPrecedingToken?: string;
    nodeExcerpt?: string;
    nodeSpacing?: string;
    nodePlainText?: string;
    nodes?: ISnapshotItem[];
}
export declare class TestHelpers {
    /**
     * Pretty print a line with "<" and ">" markers to indicate a text range.
     */
    static formatLineSpan(line: TextRange, range: TextRange): string;
    /**
     * Workaround various characters that get ugly escapes in Jest snapshots
     */
    static getEscaped(s: string): string;
    /**
     * Main harness for tests under `./parser/*`.
     */
    static parseAndMatchNodeParserSnapshot(buffer: string, config?: TSDocConfiguration): void;
    /**
     * Main harness for tests under `./details/*`.
     */
    static parseAndMatchDocCommentSnapshot(buffer: string, configuration?: TSDocConfiguration): ParserContext;
    /**
     * Render a nice Jest snapshot object for a DocNode tree.
     */
    static getDocNodeSnapshot(docNode: DocNode | undefined): ISnapshotItem | undefined;
    private static _getTokenCoverageGapsSnapshot;
}
export {};
//# sourceMappingURL=TestHelpers.d.ts.map