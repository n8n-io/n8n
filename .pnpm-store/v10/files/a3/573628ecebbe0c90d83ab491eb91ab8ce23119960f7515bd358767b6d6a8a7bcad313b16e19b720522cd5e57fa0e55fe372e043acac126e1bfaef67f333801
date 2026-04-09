declare class SqlBatchPayload implements Iterable<Buffer> {
    sqlText: string;
    txnDescriptor: Buffer;
    options: {
        tdsVersion: string;
    };
    constructor(sqlText: string, txnDescriptor: Buffer, options: {
        tdsVersion: string;
    });
    [Symbol.iterator](): Generator<Buffer<ArrayBufferLike>, void, unknown>;
    toString(indent?: string): string;
}
export default SqlBatchPayload;
