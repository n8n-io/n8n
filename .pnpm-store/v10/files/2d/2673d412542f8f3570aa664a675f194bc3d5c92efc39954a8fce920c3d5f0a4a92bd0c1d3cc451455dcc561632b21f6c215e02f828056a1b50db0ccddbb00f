/** @implements {IPDFStream} */
export class PDFFetchStream implements IPDFStream {
    constructor(source: any);
    _responseOrigin: null;
    source: any;
    isHttp: boolean;
    headers: Headers;
    _fullRequestReader: PDFFetchStreamReader | null;
    _rangeRequestReaders: any[];
    get _progressiveDataLength(): number;
    getFullReader(): PDFFetchStreamReader;
    getRangeReader(begin: any, end: any): PDFFetchStreamRangeReader | null;
    cancelAllRequests(reason: any): void;
}
/** @implements {IPDFStreamReader} */
declare class PDFFetchStreamReader implements IPDFStreamReader {
    constructor(stream: any);
    _stream: any;
    _reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> | null;
    _loaded: number;
    _filename: string | null;
    _withCredentials: any;
    _contentLength: any;
    _headersCapability: any;
    _disableRange: any;
    _rangeChunkSize: any;
    _abortController: AbortController;
    _isStreamingSupported: boolean;
    _isRangeSupported: boolean;
    onProgress: any;
    get headersReady(): any;
    get filename(): string | null;
    get contentLength(): any;
    get isRangeSupported(): boolean;
    get isStreamingSupported(): boolean;
    read(): Promise<{
        value: any;
        done: boolean;
    }>;
    cancel(reason: any): void;
}
/** @implements {IPDFStreamRangeReader} */
declare class PDFFetchStreamRangeReader implements IPDFStreamRangeReader {
    constructor(stream: any, begin: any, end: any);
    _stream: any;
    _reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> | null;
    _loaded: number;
    _withCredentials: any;
    _readCapability: any;
    _isStreamingSupported: boolean;
    _abortController: AbortController;
    onProgress: any;
    get isStreamingSupported(): boolean;
    read(): Promise<{
        value: any;
        done: boolean;
    }>;
    cancel(reason: any): void;
}
export {};
