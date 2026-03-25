import { Tokenizer, TokenizerMode, type TokenHandler } from '../tokenizer/index.js';
import { OpenElementStack, type StackHandler } from './open-element-stack.js';
import { FormattingElementList } from './formatting-element-list.js';
import { ERR, type ParserErrorHandler } from '../common/error-codes.js';
import { TAG_ID as $, NS } from '../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface.js';
import { type Token, type CommentToken, type CharacterToken, type TagToken, type DoctypeToken, type EOFToken, type LocationWithAttributes } from '../common/token.js';
declare enum InsertionMode {
    INITIAL = 0,
    BEFORE_HTML = 1,
    BEFORE_HEAD = 2,
    IN_HEAD = 3,
    IN_HEAD_NO_SCRIPT = 4,
    AFTER_HEAD = 5,
    IN_BODY = 6,
    TEXT = 7,
    IN_TABLE = 8,
    IN_TABLE_TEXT = 9,
    IN_CAPTION = 10,
    IN_COLUMN_GROUP = 11,
    IN_TABLE_BODY = 12,
    IN_ROW = 13,
    IN_CELL = 14,
    IN_SELECT = 15,
    IN_SELECT_IN_TABLE = 16,
    IN_TEMPLATE = 17,
    AFTER_BODY = 18,
    IN_FRAMESET = 19,
    AFTER_FRAMESET = 20,
    AFTER_AFTER_BODY = 21,
    AFTER_AFTER_FRAMESET = 22
}
export interface ParserOptions<T extends TreeAdapterTypeMap> {
    /**
     * The [scripting flag](https://html.spec.whatwg.org/multipage/parsing.html#scripting-flag). If set
     * to `true`, `noscript` element content will be parsed as text.
     *
     *  @default `true`
     */
    scriptingEnabled?: boolean;
    /**
     * Enables source code location information. When enabled, each node (except the root node)
     * will have a `sourceCodeLocation` property. If the node is not an empty element, `sourceCodeLocation` will
     * be a {@link ElementLocation} object, otherwise it will be {@link Location}.
     * If the element was implicitly created by the parser (as part of
     * [tree correction](https://html.spec.whatwg.org/multipage/syntax.html#an-introduction-to-error-handling-and-strange-cases-in-the-parser)),
     * its `sourceCodeLocation` property will be `undefined`.
     *
     * @default `false`
     */
    sourceCodeLocationInfo?: boolean;
    /**
     * Specifies the resulting tree format.
     *
     * @default `treeAdapters.default`
     */
    treeAdapter?: TreeAdapter<T>;
    /**
     * Callback for parse errors.
     *
     * @default `null`
     */
    onParseError?: ParserErrorHandler | null;
}
export declare class Parser<T extends TreeAdapterTypeMap> implements TokenHandler, StackHandler<T> {
    fragmentContext: T['element'] | null;
    scriptHandler: null | ((pendingScript: T['element']) => void);
    treeAdapter: TreeAdapter<T>;
    onParseError: ParserErrorHandler | null;
    private currentToken;
    options: Required<ParserOptions<T>>;
    document: T['document'];
    constructor(options?: ParserOptions<T>, document?: T['document'], fragmentContext?: T['element'] | null, scriptHandler?: null | ((pendingScript: T['element']) => void));
    static parse<T extends TreeAdapterTypeMap>(html: string, options?: ParserOptions<T>): T['document'];
    static getFragmentParser<T extends TreeAdapterTypeMap>(fragmentContext?: T['parentNode'] | null, options?: ParserOptions<T>): Parser<T>;
    getFragment(): T['documentFragment'];
    tokenizer: Tokenizer;
    stopped: boolean;
    insertionMode: InsertionMode;
    originalInsertionMode: InsertionMode;
    fragmentContextID: $;
    headElement: null | T['element'];
    formElement: null | T['element'];
    openElements: OpenElementStack<T>;
    activeFormattingElements: FormattingElementList<T>;
    /** Indicates that the current node is not an element in the HTML namespace */
    private currentNotInHTML;
    /**
     * The template insertion mode stack is maintained from the left.
     * Ie. the topmost element will always have index 0.
     */
    tmplInsertionModeStack: InsertionMode[];
    pendingCharacterTokens: CharacterToken[];
    hasNonWhitespacePendingCharacterToken: boolean;
    framesetOk: boolean;
    skipNextNewLine: boolean;
    fosterParentingEnabled: boolean;
    _err(token: Token, code: ERR, beforeToken?: boolean): void;
    onItemPush(node: T['parentNode'], tid: number, isTop: boolean): void;
    onItemPop(node: T['parentNode'], isTop: boolean): void;
    private _setContextModes;
    _switchToTextParsing(currentToken: TagToken, nextTokenizerState: typeof TokenizerMode[keyof typeof TokenizerMode]): void;
    switchToPlaintextParsing(): void;
    _getAdjustedCurrentElement(): T['element'];
    _findFormInFragmentContext(): void;
    private _initTokenizerForFragmentParsing;
    _setDocumentType(token: DoctypeToken): void;
    _attachElementToTree(element: T['element'], location: LocationWithAttributes | null): void;
    _appendElement(token: TagToken, namespaceURI: NS): void;
    _insertElement(token: TagToken, namespaceURI: NS): void;
    _insertFakeElement(tagName: string, tagID: $): void;
    _insertTemplate(token: TagToken): void;
    _insertFakeRootElement(): void;
    _appendCommentNode(token: CommentToken, parent: T['parentNode']): void;
    _insertCharacters(token: CharacterToken): void;
    _adoptNodes(donor: T['parentNode'], recipient: T['parentNode']): void;
    _setEndLocation(element: T['element'], closingToken: Token): void;
    private shouldProcessStartTagTokenInForeignContent;
    _processToken(token: Token): void;
    _isIntegrationPoint(tid: $, element: T['element'], foreignNS?: NS): boolean;
    _reconstructActiveFormattingElements(): void;
    _closeTableCell(): void;
    _closePElement(): void;
    _resetInsertionMode(): void;
    _resetInsertionModeForSelect(selectIdx: number): void;
    _isElementCausesFosterParenting(tn: $): boolean;
    _shouldFosterParentOnInsertion(): boolean;
    _findFosterParentingLocation(): {
        parent: T['parentNode'];
        beforeElement: T['element'] | null;
    };
    _fosterParentElement(element: T['element']): void;
    _isSpecialElement(element: T['element'], id: $): boolean;
    onCharacter(token: CharacterToken): void;
    onNullCharacter(token: CharacterToken): void;
    onComment(token: CommentToken): void;
    onDoctype(token: DoctypeToken): void;
    onStartTag(token: TagToken): void;
    /**
     * Processes a given start tag.
     *
     * `onStartTag` checks if a self-closing tag was recognized. When a token
     * is moved inbetween multiple insertion modes, this check for self-closing
     * could lead to false positives. To avoid this, `_processStartTag` is used
     * for nested calls.
     *
     * @param token The token to process.
     */
    _processStartTag(token: TagToken): void;
    _startTagOutsideForeignContent(token: TagToken): void;
    onEndTag(token: TagToken): void;
    _endTagOutsideForeignContent(token: TagToken): void;
    onEof(token: EOFToken): void;
    onWhitespaceCharacter(token: CharacterToken): void;
}
export {};
//# sourceMappingURL=index.d.ts.map