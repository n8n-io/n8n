/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
export type Agent = any;

// @ts-ignore
declare const _fetch:                                        typeof fetch;
export { _fetch as fetch };

// @ts-ignore
type _Request =                                   Request;
export { _Request as Request };

// @ts-ignore
type _RequestInfo =                                       RequestInfo;
export { type _RequestInfo as RequestInfo };

// @ts-ignore
type _RequestInit =                                       RequestInit;
export { type _RequestInit as RequestInit };

// @ts-ignore
type _Response =                                    Response;
export { _Response as Response };

// @ts-ignore
type _ResponseInit =                                        ResponseInit;
export { type _ResponseInit as ResponseInit };

// @ts-ignore
type _ResponseType =                                        ResponseType;
export { type _ResponseType as ResponseType };

// @ts-ignore
type _BodyInit =                                    BodyInit;
export { type _BodyInit as BodyInit };

// @ts-ignore
type _Headers =                                   Headers;
export { _Headers as Headers };

// @ts-ignore
type _HeadersInit =                                       HeadersInit;
export { type _HeadersInit as HeadersInit };

type EndingType = 'native' | 'transparent';

export interface BlobPropertyBag {
  endings?: EndingType;
  type?: string;
}

export interface FilePropertyBag extends BlobPropertyBag {
  lastModified?: number;
}

export type FileFromPathOptions = Omit<FilePropertyBag, 'lastModified'>;

// @ts-ignore
type _FormData =                                    FormData;
// @ts-ignore
declare const _FormData:                                           typeof FormData;
export { _FormData as FormData };

// @ts-ignore
type _File =                                File;
// @ts-ignore
declare const _File:                                       typeof File;
export { _File as File };

// @ts-ignore
type _Blob =                                Blob;
// @ts-ignore
declare const _Blob:                                       typeof Blob;
export { _Blob as Blob };

export declare class Readable {
  readable: boolean;
  readonly readableEnded: boolean;
  readonly readableFlowing: boolean | null;
  readonly readableHighWaterMark: number;
  readonly readableLength: number;
  readonly readableObjectMode: boolean;
  destroyed: boolean;
  read(size?: number): any;
  pause(): this;
  resume(): this;
  isPaused(): boolean;
  destroy(error?: Error): this;
  [Symbol.asyncIterator](): AsyncIterableIterator<any>;
}

export declare class FsReadStream extends Readable {
  path: {}; // node type is string | Buffer
}

// @ts-ignore
type _ReadableStream<R = any> =                                             ReadableStream<R>;
// @ts-ignore
declare const _ReadableStream:                                                 typeof ReadableStream;
export { _ReadableStream as ReadableStream };
