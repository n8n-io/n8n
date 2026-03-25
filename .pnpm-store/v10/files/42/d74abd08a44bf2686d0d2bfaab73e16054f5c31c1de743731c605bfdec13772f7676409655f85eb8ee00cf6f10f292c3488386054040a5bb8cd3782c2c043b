/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
import { type RequestOptions } from "../core.js";
export interface Shims {
    kind: string;
    fetch: any;
    Request: any;
    Response: any;
    Headers: any;
    FormData: any;
    Blob: any;
    File: any;
    ReadableStream: any;
    getMultipartRequestOptions: <T = Record<string, unknown>>(form: Shims['FormData'], opts: RequestOptions<T>) => Promise<RequestOptions<T>>;
    getDefaultAgent: (url: string) => any;
    fileFromPath: ((path: string, filename?: string, options?: {}) => Promise<Shims['File']>) | ((path: string, options?: {}) => Promise<Shims['File']>);
    isFsReadStream: (value: any) => boolean;
}
export declare let auto: boolean;
export declare let kind: Shims['kind'] | undefined;
export declare let fetch: Shims['fetch'] | undefined;
export declare let Request: Shims['Request'] | undefined;
export declare let Response: Shims['Response'] | undefined;
export declare let Headers: Shims['Headers'] | undefined;
export declare let FormData: Shims['FormData'] | undefined;
export declare let Blob: Shims['Blob'] | undefined;
export declare let File: Shims['File'] | undefined;
export declare let ReadableStream: Shims['ReadableStream'] | undefined;
export declare let getMultipartRequestOptions: Shims['getMultipartRequestOptions'] | undefined;
export declare let getDefaultAgent: Shims['getDefaultAgent'] | undefined;
export declare let fileFromPath: Shims['fileFromPath'] | undefined;
export declare let isFsReadStream: Shims['isFsReadStream'] | undefined;
export declare function setShims(shims: Shims, options?: {
    auto: boolean;
}): void;
//# sourceMappingURL=registry.d.ts.map