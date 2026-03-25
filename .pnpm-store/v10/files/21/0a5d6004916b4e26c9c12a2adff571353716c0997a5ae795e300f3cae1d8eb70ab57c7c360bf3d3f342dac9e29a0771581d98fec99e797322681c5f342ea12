/**
 * @module
 * Buffer utility.
 */
export declare const equal: (a: ArrayBuffer, b: ArrayBuffer) => boolean;
type StringHashFunction = (input: string) => string | null | Promise<string | null>;
type TimingSafeEqual = {
    (a: string, b: string, hashFunction?: StringHashFunction): Promise<boolean>;
    /**
     * @deprecated object and boolean signatures that take boolean as first and second arguments, and functions with signatures that take non-string arguments have been deprecated
     */
    (a: string | object | boolean, b: string | object | boolean, hashFunction?: Function): Promise<boolean>;
};
export declare const timingSafeEqual: TimingSafeEqual;
export declare const bufferToString: (buffer: ArrayBuffer) => string;
export declare const bufferToFormData: (arrayBuffer: ArrayBuffer, contentType: string) => Promise<FormData>;
export {};
