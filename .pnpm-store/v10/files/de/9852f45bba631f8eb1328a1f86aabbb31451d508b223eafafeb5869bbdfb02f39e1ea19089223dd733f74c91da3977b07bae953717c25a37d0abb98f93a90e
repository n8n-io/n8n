import { type Bytes } from "./line.mjs";
export declare class JSONLDecoder<T> {
    private iterator;
    controller: AbortController;
    constructor(iterator: AsyncIterableIterator<Bytes>, controller: AbortController);
    private decoder;
    [Symbol.asyncIterator](): AsyncIterator<T>;
    static fromResponse<T>(response: Response, controller: AbortController): JSONLDecoder<T>;
}
//# sourceMappingURL=jsonl.d.mts.map