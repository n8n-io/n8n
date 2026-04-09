export declare const OPERATION_TYPE: {
    TM_GET_DTC_ADDRESS: number;
    TM_PROPAGATE_XACT: number;
    TM_BEGIN_XACT: number;
    TM_PROMOTE_XACT: number;
    TM_COMMIT_XACT: number;
    TM_ROLLBACK_XACT: number;
    TM_SAVE_XACT: number;
};
export declare const ISOLATION_LEVEL: {
    [key: string]: number;
};
export declare const isolationLevelByValue: {
    [key: number]: string;
};
export declare function assertValidIsolationLevel(isolationLevel: any, name: string): asserts isolationLevel is 0 | 1 | 2 | 3 | 4 | 5;
export declare class Transaction {
    name: string;
    isolationLevel: number;
    outstandingRequestCount: number;
    constructor(name: string, isolationLevel?: number);
    beginPayload(txnDescriptor: Buffer): {
        [Symbol.iterator](): Generator<Buffer<ArrayBufferLike>, void, unknown>;
        toString: () => string;
    };
    commitPayload(txnDescriptor: Buffer): {
        [Symbol.iterator](): Generator<Buffer<ArrayBufferLike>, void, unknown>;
        toString: () => string;
    };
    rollbackPayload(txnDescriptor: Buffer): {
        [Symbol.iterator](): Generator<Buffer<ArrayBufferLike>, void, unknown>;
        toString: () => string;
    };
    savePayload(txnDescriptor: Buffer): {
        [Symbol.iterator](): Generator<Buffer<ArrayBufferLike>, void, unknown>;
        toString: () => string;
    };
    isolationLevelToTSQL(): "" | "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE" | "SNAPSHOT";
}
