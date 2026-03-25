import type { BaseError } from '@intlify/shared';
import type { RawSourceMap } from 'source-map-js';

export declare function baseCompile(source: string, options?: CompileOptions): CompilerResult;

export declare type CacheKeyHandler = (source: string) => string;

export declare interface CodeGenOptions {
    location?: boolean;
    mode?: 'normal' | 'arrow';
    breakLineCode?: '\n' | ';';
    needIndent?: boolean;
    onError?: CompileErrorHandler;
    sourceMap?: boolean;
    filename?: string;
}

declare interface CodeGenResult {
    code: string;
    ast: ResourceNode;
    map?: RawSourceMap;
}

export declare const COMPILE_ERROR_CODES_EXTEND_POINT = 17;

export declare type CompileDomain = 'tokenizer' | 'parser' | 'generator' | 'transformer' | 'optimizer' | 'minifier';

export declare interface CompileError extends BaseError, SyntaxError {
    domain?: CompileDomain;
    location?: SourceLocation;
}

export declare const CompileErrorCodes: {
    readonly EXPECTED_TOKEN: 1;
    readonly INVALID_TOKEN_IN_PLACEHOLDER: 2;
    readonly UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER: 3;
    readonly UNKNOWN_ESCAPE_SEQUENCE: 4;
    readonly INVALID_UNICODE_ESCAPE_SEQUENCE: 5;
    readonly UNBALANCED_CLOSING_BRACE: 6;
    readonly UNTERMINATED_CLOSING_BRACE: 7;
    readonly EMPTY_PLACEHOLDER: 8;
    readonly NOT_ALLOW_NEST_PLACEHOLDER: 9;
    readonly INVALID_LINKED_FORMAT: 10;
    readonly MUST_HAVE_MESSAGES_IN_PLURAL: 11;
    readonly UNEXPECTED_EMPTY_LINKED_MODIFIER: 12;
    readonly UNEXPECTED_EMPTY_LINKED_KEY: 13;
    readonly UNEXPECTED_LEXICAL_ANALYSIS: 14;
    readonly UNHANDLED_CODEGEN_NODE_TYPE: 15;
    readonly UNHANDLED_MINIFIER_NODE_TYPE: 16;
};

export declare type CompileErrorCodes = (typeof CompileErrorCodes)[keyof typeof CompileErrorCodes];

export declare type CompileErrorHandler = (error: CompileError) => void;

export declare interface CompileErrorOptions {
    domain?: CompileDomain;
    messages?: {
        [code: number]: string;
    };
    args?: unknown[];
}

export declare type CompileOptions = {
    optimize?: boolean;
    minify?: boolean;
    jit?: boolean;
} & TransformOptions & CodeGenOptions & ParserOptions & TokenizeOptions;

export declare type CompilerResult = CodeGenResult;

export declare function createCompileError<T extends number>(code: T, loc: SourceLocation | null, options?: CompileErrorOptions): CompileError;

export declare function createLocation(start: Position, end: Position, source?: string): SourceLocation;

export declare function createParser(options?: ParserOptions): Parser;

export declare function createPosition(line: number, column: number, offset: number): Position;

/* Excluded from this release type: defaultOnError */

export declare const detectHtmlTag: (source: string) => boolean;

export declare const ERROR_DOMAIN = "parser";

/* Excluded from this release type: errorMessages */

export declare const enum HelperNameMap {
    LIST = "list",
    NAMED = "named",
    PLURAL = "plural",
    LINKED = "linked",
    MESSAGE = "message",
    TYPE = "type",
    INTERPOLATE = "interpolate",
    NORMALIZE = "normalize",
    VALUES = "values"
}

export declare type Identifier = string;

export declare interface LinkedKeyNode extends Node_2 {
    type: NodeTypes.LinkedKey;
    value: string;
    /* Excluded from this release type: v */
}

export declare interface LinkedModifierNode extends Node_2 {
    type: NodeTypes.LinkedModifier;
    value: Identifier;
    /* Excluded from this release type: v */
}

export declare interface LinkedNode extends Node_2 {
    type: NodeTypes.Linked;
    modifier?: LinkedModifierNode;
    /* Excluded from this release type: m */
    key: LinkedKeyNode | NamedNode | ListNode | LiteralNode;
    /* Excluded from this release type: k */
}

export declare interface ListNode extends Node_2 {
    type: NodeTypes.List;
    index: number;
    /* Excluded from this release type: i */
}

export declare interface LiteralNode extends Node_2 {
    type: NodeTypes.Literal;
    value?: string;
    /* Excluded from this release type: v */
}

export declare const LOCATION_STUB: SourceLocation;

declare type MessageElementNode = TextNode | NamedNode | ListNode | LiteralNode | LinkedNode;

export declare interface MessageNode extends Node_2 {
    type: NodeTypes.Message;
    static?: string;
    /* Excluded from this release type: s */
    items: MessageElementNode[];
    /* Excluded from this release type: i */
}

export declare interface NamedNode extends Node_2 {
    type: NodeTypes.Named;
    key: Identifier;
    modulo?: boolean;
    /* Excluded from this release type: k */
}

declare interface Node_2 {
    type: NodeTypes;
    /* Excluded from this release type: t */
    start?: number;
    end?: number;
    loc?: SourceLocation;
}
export { Node_2 as Node }

export declare const enum NodeTypes {
    Resource = 0,// 0
    Plural = 1,
    Message = 2,
    Text = 3,
    Named = 4,
    List = 5,// 5
    Linked = 6,
    LinkedKey = 7,
    LinkedModifier = 8,
    Literal = 9
}

export declare interface Parser {
    parse(source: string): ResourceNode;
}

export declare interface ParserOptions {
    location?: boolean;
    onCacheKey?: (source: string) => string;
    onError?: CompileErrorHandler;
}

export declare interface PluralNode extends Node_2 {
    type: NodeTypes.Plural;
    cases: MessageNode[];
    /* Excluded from this release type: c */
}

export declare interface Position {
    offset: number;
    line: number;
    column: number;
}

export declare interface ResourceNode extends Node_2 {
    type: NodeTypes.Resource;
    body: MessageNode | PluralNode;
    /* Excluded from this release type: b */
    cacheKey?: string;
    helpers?: string[];
}

export declare interface SourceLocation {
    start: Position;
    end: Position;
    source?: string;
}

export declare interface TextNode extends Node_2 {
    type: NodeTypes.Text;
    value?: string;
    /* Excluded from this release type: v */
}

export declare interface TokenizeOptions {
    location?: boolean;
    onError?: CompileErrorHandler;
}

export declare interface TransformOptions {
    onError?: CompileErrorHandler;
}

export { }
