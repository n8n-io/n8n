import BulkLoad from './bulk-load';
export declare class BulkLoadPayload implements AsyncIterable<Buffer> {
    bulkLoad: BulkLoad;
    iterator: AsyncIterableIterator<Buffer>;
    constructor(bulkLoad: BulkLoad);
    [Symbol.asyncIterator](): AsyncIterableIterator<Buffer<ArrayBufferLike>>;
    toString(indent?: string): string;
}
