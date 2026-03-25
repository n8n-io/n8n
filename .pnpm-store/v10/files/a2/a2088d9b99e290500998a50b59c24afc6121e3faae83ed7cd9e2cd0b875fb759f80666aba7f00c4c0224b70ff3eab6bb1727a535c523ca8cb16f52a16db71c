/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
export type Agent = any;

// @ts-ignore
declare const _fetch: unknown extends typeof fetch ? never : typeof fetch;
export { _fetch as fetch };

// @ts-ignore
type _Request = unknown extends Request ? never : Request;
export { _Request as Request };

// @ts-ignore
type _RequestInfo = unknown extends RequestInfo ? never : RequestInfo;
export { type _RequestInfo as RequestInfo };

// @ts-ignore
type _RequestInit = unknown extends RequestInit ? never : RequestInit;
export { type _RequestInit as RequestInit };

// @ts-ignore
type _Response = unknown extends Response ? never : Response;
export { _Response as Response };

// @ts-ignore
type _ResponseInit = unknown extends ResponseInit ? never : ResponseInit;
export { type _ResponseInit as ResponseInit };

// @ts-ignore
type _ResponseType = unknown extends ResponseType ? never : ResponseType;
export { type _ResponseType as ResponseType };

// @ts-ignore
type _BodyInit = unknown extends BodyInit ? never : BodyInit;
export { type _BodyInit as BodyInit };

// @ts-ignore
type _Headers = unknown extends Headers ? never : Headers;
export { _Headers as Headers };

// @ts-ignore
type _HeadersInit = unknown extends HeadersInit ? never : HeadersInit;
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
type _FormData = unknown extends FormData ? never : FormData;
// @ts-ignore
declare const _FormData: unknown extends typeof FormData ? never : typeof FormData;
export { _FormData as FormData };

// @ts-ignore
type _File = unknown extends File ? never : File;
// @ts-ignore
declare const _File: unknown extends typeof File ? never : typeof File;
export { _File as File };

// @ts-ignore
type _Blob = unknown extends Blob ? never : Blob;
// @ts-ignore
declare const _Blob: unknown extends typeof Blob ? never : typeof Blob;
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
type _ReadableStream<R = any> = unknown extends ReadableStream<R> ? never : ReadableStream<R>;
// @ts-ignore
declare const _ReadableStream: unknown extends typeof ReadableStream ? never : typeof ReadableStream;
export { _ReadableStream as ReadableStream };
