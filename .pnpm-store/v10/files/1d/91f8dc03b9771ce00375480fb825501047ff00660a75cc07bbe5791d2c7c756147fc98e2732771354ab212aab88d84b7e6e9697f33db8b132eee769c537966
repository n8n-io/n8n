import { CoverageMap, CoverageSummary, FileCoverage } from "istanbul-lib-coverage";

/**
 * returns a reporting context for the supplied options
 */
export function createContext(options?: Partial<ContextOptions>): Context;
/**
 * returns the default watermarks that would be used when not
 * overridden
 */
export function getDefaultWatermarks(): Watermarks;
export class ReportBase {
    constructor(options?: Partial<ReportBaseOptions>);
    execute(context: Context): void;
}

export interface ReportBaseOptions {
    summarizer: Summarizers;
}

export type Summarizers = "flat" | "nested" | "pkg" | "defaultSummarizer";

export interface ContextOptions {
    coverageMap: CoverageMap;
    defaultSummarizer: Summarizers;
    dir: string;
    watermarks: Partial<Watermarks>;
    sourceFinder(filepath: string): string;
}

export interface Context {
    data: any;
    dir: string;
    sourceFinder(filepath: string): string;
    watermarks: Watermarks;
    writer: FileWriter;
    /**
     * returns the coverage class given a coverage
     * types and a percentage value.
     */
    classForPercent(type: keyof Watermarks, value: number): string;
    /**
     * returns the source code for the specified file path or throws if
     * the source could not be found.
     */
    getSource(filepath: string): string;
    getTree(summarizer?: Summarizers): Tree;
    /**
     * returns a full visitor given a partial one.
     */
    getVisitor<N extends Node = Node>(visitor: Partial<Visitor<N>>): Visitor<N>;
    /**
     * returns a FileWriter implementation for reporting use. Also available
     * as the `writer` property on the context.
     */
    getWriter(): FileWriter;
    /**
     * returns an XML writer for the supplied content writer
     */
    getXmlWriter(contentWriter: ContentWriter): XmlWriter;
}

/**
 * Base class for writing content
 */
export class ContentWriter {
    /**
     * returns the colorized version of a string. Typically,
     * content writers that write to files will return the
     * same string and ones writing to a tty will wrap it in
     * appropriate escape sequences.
     */
    colorize(str: string, clazz?: string): string;
    /**
     * writes a string appended with a newline to the destination
     */
    println(str: string): void;
    /**
     * closes this content writer. Should be called after all writes are complete.
     */
    close(): void;
}

/**
 * a content writer that writes to a file
 */
export class FileContentWriter extends ContentWriter {
    constructor(fileDescriptor: number);
    write(str: string): void;
}

/**
 * a content writer that writes to the console
 */
export class ConsoleWriter extends ContentWriter {
    write(str: string): void;
}

/**
 * utility for writing files under a specific directory
 */
export class FileWriter {
    constructor(baseDir: string);
    static startCapture(): void;
    static stopCapture(): void;
    static getOutput(): string;
    static resetOutput(): void;
    /**
     * returns a FileWriter that is rooted at the supplied subdirectory
     */
    writeForDir(subdir: string): FileWriter;
    /**
     * copies a file from a source directory to a destination name
     */
    copyFile(source: string, dest: string, header?: string): void;
    /**
     * returns a content writer for writing content to the supplied file.
     */
    writeFile(file: string | null): ContentWriter;
}

export interface XmlWriter {
    indent(str: string): string;
    /**
     * writes the opening XML tag with the supplied attributes
     */
    openTag(name: string, attrs?: any): void;
    /**
     * closes an open XML tag.
     */
    closeTag(name: string): void;
    /**
     * writes a tag and its value opening and closing it at the same time
     */
    inlineTag(name: string, attrs?: any, content?: string): void;
    /**
     * closes all open tags and ends the document
     */
    closeAll(): void;
}

export type Watermark = [number, number];

export interface Watermarks {
    statements: Watermark;
    functions: Watermark;
    branches: Watermark;
    lines: Watermark;
}

export interface Node {
    isRoot(): boolean;
    visit(visitor: Visitor, state: any): void;
}

export interface ReportNode extends Node {
    path: string;
    parent: ReportNode | null;
    fileCoverage: FileCoverage;
    children: ReportNode[];
    addChild(child: ReportNode): void;
    asRelative(p: string): string;
    getQualifiedName(): string;
    getRelativeName(): string;
    getParent(): Node;
    getChildren(): Node[];
    isSummary(): boolean;
    getFileCoverage(): FileCoverage;
    getCoverageSummary(filesOnly: boolean): CoverageSummary;
    visit(visitor: Visitor<ReportNode>, state: any): void;
}

export interface Visitor<N extends Node = Node> {
    onStart(root: N, state: any): void;
    onSummary(root: N, state: any): void;
    onDetail(root: N, state: any): void;
    onSummaryEnd(root: N, state: any): void;
    onEnd(root: N, state: any): void;
}

export interface Tree<N extends Node = Node> {
    getRoot(): N;
    visit(visitor: Partial<Visitor<N>>, state: any): void;
}
