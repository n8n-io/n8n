export declare class StorageError extends Error {
    protected __isStorageError: boolean;
    constructor(message: string);
}
export declare function isStorageError(error: unknown): error is StorageError;
export declare class StorageApiError extends StorageError {
    status: number;
    constructor(message: string, status: number);
    toJSON(): {
        name: string;
        message: string;
        status: number;
    };
}
export declare class StorageUnknownError extends StorageError {
    originalError: unknown;
    constructor(message: string, originalError: unknown);
}
//# sourceMappingURL=errors.d.ts.map