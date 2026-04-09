interface Options {
    encrypt: boolean;
    version: {
        major: number;
        minor: number;
        build: number;
        subbuild: number;
    };
}
declare class PreloginPayload {
    data: Buffer;
    options: Options;
    version: {
        major: number;
        minor: number;
        build: number;
        subbuild: number;
    };
    encryption: number;
    encryptionString: string;
    instance: number;
    threadId: number;
    mars: number;
    marsString: string;
    traceId: Buffer;
    fedAuthRequired: number;
    constructor(bufferOrOptions?: Buffer | Options);
    createOptions(): void;
    createVersionOption(): {
        token: number;
        data: Buffer<ArrayBufferLike>;
    };
    createEncryptionOption(): {
        token: number;
        data: Buffer<ArrayBufferLike>;
    };
    createInstanceOption(): {
        token: number;
        data: Buffer<ArrayBufferLike>;
    };
    createThreadIdOption(): {
        token: number;
        data: Buffer<ArrayBufferLike>;
    };
    createMarsOption(): {
        token: number;
        data: Buffer<ArrayBufferLike>;
    };
    createTraceIdOption(): {
        token: number;
        data: Buffer<ArrayBufferLike>;
    };
    createFedAuthOption(): {
        token: number;
        data: Buffer<ArrayBufferLike>;
    };
    extractOptions(): void;
    extractVersion(offset: number): void;
    extractEncryption(offset: number): void;
    extractInstance(offset: number): void;
    extractThreadId(offset: number): void;
    extractMars(offset: number): void;
    extractTraceId(offset: number): void;
    extractFedAuth(offset: number): void;
    toString(indent?: string): string;
}
export default PreloginPayload;
