export declare class EncodingError extends Error {
    constructor(message: string);
}
export declare function encodeMatrix(key: string, value: unknown, options?: {
    explode?: boolean;
    charEncoding?: "percent" | "none";
}): string | undefined;
export declare function encodeLabel(key: string, value: unknown, options?: {
    explode?: boolean;
    charEncoding?: "percent" | "none";
}): string | undefined;
type FormEncoder = (key: string, value: unknown, options?: {
    explode?: boolean;
    charEncoding?: "percent" | "none";
}) => string | undefined;
export declare const encodeForm: FormEncoder;
export declare const encodeSpaceDelimited: FormEncoder;
export declare const encodePipeDelimited: FormEncoder;
export declare function encodeBodyForm(key: string, value: unknown, options?: {
    explode?: boolean;
    charEncoding?: "percent" | "none";
}): string;
export declare function encodeDeepObject(key: string, value: unknown, options?: {
    charEncoding?: "percent" | "none";
}): string | undefined;
export declare function encodeDeepObjectObject(key: string, value: unknown, options?: {
    charEncoding?: "percent" | "none";
}): string | undefined;
export declare function encodeJSON(key: string, value: unknown, options?: {
    explode?: boolean;
    charEncoding?: "percent" | "none";
}): string | undefined;
export declare const encodeSimple: (key: string, value: unknown, options?: {
    explode?: boolean;
    charEncoding?: "percent" | "none";
}) => string | undefined;
export declare function queryJoin(...args: (string | undefined)[]): string;
type QueryEncoderOptions = {
    explode?: boolean;
    charEncoding?: "percent" | "none";
    allowEmptyValue?: string[];
};
type QueryEncoder = (key: string, value: unknown, options?: QueryEncoderOptions) => string | undefined;
type BulkQueryEncoder = (values: Record<string, unknown>, options?: QueryEncoderOptions) => string;
export declare function queryEncoder(f: QueryEncoder): BulkQueryEncoder;
export declare const encodeJSONQuery: BulkQueryEncoder;
export declare const encodeFormQuery: BulkQueryEncoder;
export declare const encodeSpaceDelimitedQuery: BulkQueryEncoder;
export declare const encodePipeDelimitedQuery: BulkQueryEncoder;
export declare const encodeDeepObjectQuery: BulkQueryEncoder;
export declare function appendForm(fd: FormData, key: string, value: unknown, fileName?: string): void;
export {};
//# sourceMappingURL=encodings.d.ts.map