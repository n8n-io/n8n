export declare type MaybePromise<T> = Promise<T> | T;
declare type FormDataRequest<Body> = {
    body: Body;
    headers: Record<string, string>;
    duplex?: "half";
};
export interface CrossPlatformFormData {
    setup(): Promise<void>;
    append(key: string, value: unknown): void;
    appendFile(key: string, value: unknown, fileName?: string): Promise<void>;
    getRequest(): MaybePromise<FormDataRequest<unknown>>;
}
export declare function newFormData(): Promise<CrossPlatformFormData>;
export declare type Node18FormDataFd = {
    append(name: string, value: unknown, fileName?: string): void;
} | undefined;
/**
 * Form Data Implementation for Node.js 18+
 */
export declare class Node18FormData implements CrossPlatformFormData {
    private fd;
    setup(): Promise<void>;
    append(key: string, value: any): void;
    appendFile(key: string, value: unknown, fileName?: string): Promise<void>;
    getRequest(): Promise<FormDataRequest<unknown>>;
}
export declare type Node16FormDataFd = {
    append(name: string, value: unknown, options?: string | {
        header?: string | Headers;
        knownLength?: number;
        filename?: string;
        filepath?: string;
        contentType?: string;
    }): void;
    getHeaders(): Record<string, string>;
} | undefined;
/**
 * Form Data Implementation for Node.js 16-18
 */
export declare class Node16FormData implements CrossPlatformFormData {
    private fd;
    setup(): Promise<void>;
    append(key: string, value: any): void;
    appendFile(key: string, value: unknown, fileName?: string): Promise<void>;
    getRequest(): FormDataRequest<Node16FormDataFd>;
}
export declare type WebFormDataFd = {
    append(name: string, value: string | Blob, fileName?: string): void;
} | undefined;
/**
 * Form Data Implementation for Web
 */
export declare class WebFormData implements CrossPlatformFormData {
    protected fd: WebFormDataFd;
    setup(): Promise<void>;
    append(key: string, value: any): void;
    appendFile(key: string, value: any, fileName?: string): Promise<void>;
    getRequest(): FormDataRequest<WebFormDataFd>;
}
export {};
