import type { YAMLNode, LoadOptions } from 'yaml-ast-parser';
import type { NormalizedNodeType } from './types';
import type { ResolveConfig } from './config/types';
export type CollectedRefs = Map<string, Document>;
export declare class Source {
    absoluteRef: string;
    body: string;
    mimeType?: string | undefined;
    constructor(absoluteRef: string, body: string, mimeType?: string | undefined);
    private _ast;
    private _lines;
    getAst(safeLoad: (input: string, options?: LoadOptions | undefined) => YAMLNode): YAMLNode;
    getLines(): string[];
}
export declare class ResolveError extends Error {
    originalError: Error;
    constructor(originalError: Error);
}
export declare class YamlParseError extends Error {
    originalError: Error;
    source: Source;
    col: number;
    line: number;
    constructor(originalError: Error, source: Source);
}
export type Document = {
    source: Source;
    parsed: any;
};
export declare function makeRefId(absoluteRef: string, pointer: string): string;
export declare function makeDocumentFromString(sourceString: string, absoluteRef: string): {
    source: Source;
    parsed: unknown;
};
export declare class BaseResolver {
    protected config: ResolveConfig;
    cache: Map<string, Promise<Document | ResolveError>>;
    constructor(config?: ResolveConfig);
    getFiles(): Set<string>;
    resolveExternalRef(base: string | null, ref: string): string;
    loadExternalRef(absoluteRef: string): Promise<Source>;
    parseDocument(source: Source, isRoot?: boolean): Document;
    resolveDocument(base: string | null, ref: string, isRoot?: boolean): Promise<Document | ResolveError | YamlParseError>;
}
export type ResolvedRef = {
    resolved: false;
    isRemote: boolean;
    nodePointer?: string;
    document?: Document;
    source?: Source;
    error?: ResolveError | YamlParseError;
    node?: any;
} | {
    resolved: true;
    node: any;
    document: Document;
    nodePointer: string;
    isRemote: boolean;
    error?: undefined;
};
export type ResolvedRefMap = Map<string, ResolvedRef>;
export declare function resolveDocument(opts: {
    rootDocument: Document;
    externalRefResolver: BaseResolver;
    rootType: NormalizedNodeType;
}): Promise<ResolvedRefMap>;
