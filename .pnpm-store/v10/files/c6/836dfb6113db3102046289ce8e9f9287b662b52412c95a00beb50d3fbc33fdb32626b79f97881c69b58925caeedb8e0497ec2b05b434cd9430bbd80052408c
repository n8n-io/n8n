import type { DocComment, DocDeclarationReference, DocHtmlEndTag, DocHtmlStartTag } from '../nodes';
import type { IStringBuilder } from './StringBuilder';
/**
 * Renders a DocNode tree as a code comment.
 */
export declare class TSDocEmitter {
    readonly eol: string;
    private _emitCommentFraming;
    private _output;
    private _lineState;
    private _previousLineHadContent;
    private _hangingParagraph;
    renderComment(output: IStringBuilder, docComment: DocComment): void;
    renderHtmlTag(output: IStringBuilder, htmlTag: DocHtmlStartTag | DocHtmlEndTag): void;
    renderDeclarationReference(output: IStringBuilder, declarationReference: DocDeclarationReference): void;
    private _renderCompleteObject;
    private _renderNode;
    private _renderInlineTag;
    private _renderNodes;
    private _ensureAtStartOfLine;
    private _ensureLineSkipped;
    private _writeContent;
    private _writeNewline;
    private _writeEnd;
}
//# sourceMappingURL=TSDocEmitter.d.ts.map