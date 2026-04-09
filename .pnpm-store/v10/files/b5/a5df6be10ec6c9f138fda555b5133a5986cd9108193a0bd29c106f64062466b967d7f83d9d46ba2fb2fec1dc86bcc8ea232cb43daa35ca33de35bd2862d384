type PARQUET_COMPRESSION_METHODS = Record<string, {
    deflate: (value: any) => Buffer | Promise<Buffer>;
    inflate: (value: any) => Buffer | Promise<Buffer>;
}>;
export declare const PARQUET_COMPRESSION_METHODS: PARQUET_COMPRESSION_METHODS;
/**
 * Deflate a value using compression method `method`
 */
export declare function deflate(method: string, value: unknown): Promise<Buffer>;
/**
 * Inflate a value using compression method `method`
 */
export declare function inflate(method: string, value: unknown): Promise<Buffer>;
export {};
