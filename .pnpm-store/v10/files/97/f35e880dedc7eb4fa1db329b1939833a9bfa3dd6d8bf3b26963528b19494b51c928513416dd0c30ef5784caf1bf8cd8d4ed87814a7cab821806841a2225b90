import { Node, Element, DataNode } from "./node";
export * from "./node";
export interface DomHandlerOptions {
    /**
     * Add a `startIndex` property to nodes.
     * When the parser is used in a non-streaming fashion, `startIndex` is an integer
     * indicating the position of the start of the node in the document.
     *
     * @default false
     */
    withStartIndices?: boolean;
    /**
     * Add an `endIndex` property to nodes.
     * When the parser is used in a non-streaming fashion, `endIndex` is an integer
     * indicating the position of the end of the node in the document.
     *
     * @default false
     */
    withEndIndices?: boolean;
    /**
     * Replace all whitespace with single spaces.
     *
     * **Note:** Enabling this might break your markup.
     *
     * @default false
     * @deprecated
     */
    normalizeWhitespace?: boolean;
}
interface ParserInterface {
    startIndex: number | null;
    endIndex: number | null;
}
declare type Callback = (error: Error | null, dom: Node[]) => void;
declare type ElementCallback = (element: Element) => void;
export declare class DomHandler {
    /** The constructed DOM */
    dom: Node[];
    /** Called once parsing has completed. */
    private readonly _callback;
    /** Settings for the handler. */
    private readonly _options;
    /** Callback whenever a tag is closed. */
    private readonly _elementCB;
    /** Indicated whether parsing has been completed. */
    private _done;
    /** Stack of open tags. */
    private _tagStack;
    /** A data node that is still being written to. */
    private _lastNode;
    /** Reference to the parser instance. Used for location information. */
    private _parser;
    /**
     * @param callback Called once parsing has completed.
     * @param options Settings for the handler.
     * @param elementCB Callback whenever a tag is closed.
     */
    constructor(callback?: Callback | null, options?: DomHandlerOptions | null, elementCB?: ElementCallback);
    onparserinit(parser: ParserInterface): void;
    onreset(): void;
    onend(): void;
    onerror(error: Error): void;
    onclosetag(): void;
    onopentag(name: string, attribs: {
        [key: string]: string;
    }): void;
    ontext(data: string): void;
    oncomment(data: string): void;
    oncommentend(): void;
    oncdatastart(): void;
    oncdataend(): void;
    onprocessinginstruction(name: string, data: string): void;
    protected handleCallback(error: Error | null): void;
    protected addNode(node: Node): void;
    protected addDataNode(node: DataNode): void;
}
export default DomHandler;
//# sourceMappingURL=index.d.ts.map