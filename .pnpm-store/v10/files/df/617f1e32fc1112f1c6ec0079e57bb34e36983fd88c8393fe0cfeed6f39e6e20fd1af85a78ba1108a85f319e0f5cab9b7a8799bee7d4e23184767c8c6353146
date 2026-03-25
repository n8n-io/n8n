export class PDFNodeStream {
    constructor(source: any);
    source: any;
    url: URL;
    _fullRequestReader: PDFNodeStreamFsFullReader | null;
    _rangeRequestReaders: any[];
    get _progressiveDataLength(): number;
    getFullReader(): PDFNodeStreamFsFullReader;
    getRangeReader(start: any, end: any): PDFNodeStreamFsRangeReader | null;
    cancelAllRequests(reason: any): void;
}
declare class PDFNodeStreamFsFullReader {
    constructor(stream: any);
    _url: any;
    _done: boolean;
    _storedError: any;
    onProgress: any;
    _contentLength: any;
    _loaded: number;
    _filename: any;
    _disableRange: any;
    _rangeChunkSize: any;
    _isStreamingSupported: boolean;
    _isRangeSupported: boolean;
    _readableStream: any;
    _readCapability: any;
    _headersCapability: any;
    get headersReady(): any;
    get filename(): any;
    get contentLength(): any;
    get isRangeSupported(): boolean;
    get isStreamingSupported(): boolean;
    read(): any;
    cancel(reason: any): void;
    _error(reason: any): void;
    _setReadableStream(readableStream: any): void;
}
declare class PDFNodeStreamFsRangeReader {
    constructor(stream: any, start: any, end: any);
    _url: any;
    _done: boolean;
    _storedError: any;
    onProgress: any;
    _loaded: number;
    _readableStream: any;
    _readCapability: any;
    _isStreamingSupported: boolean;
    get isStreamingSupported(): boolean;
    read(): any;
    cancel(reason: any): void;
    _error(reason: any): void;
    _setReadableStream(readableStream: any): void;
}
export {};
