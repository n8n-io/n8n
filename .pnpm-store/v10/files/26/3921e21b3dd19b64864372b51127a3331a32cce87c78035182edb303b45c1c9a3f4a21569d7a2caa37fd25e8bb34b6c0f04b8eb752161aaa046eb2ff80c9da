/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
import * as nf from 'node-fetch';
import * as fd from 'formdata-node';

export { type Agent } from 'node:http';
export { type Readable } from 'node:stream';
export { type ReadStream as FsReadStream } from 'node:fs';
export { ReadableStream } from 'web-streams-polyfill';

export const fetch: typeof nf.default;

export type Request = nf.Request;
export type RequestInfo = nf.RequestInfo;
export type RequestInit = nf.RequestInit;

export type Response = nf.Response;
export type ResponseInit = nf.ResponseInit;
export type ResponseType = nf.ResponseType;
export type BodyInit = nf.BodyInit;
export type Headers = nf.Headers;
export type HeadersInit = nf.HeadersInit;

type EndingType = 'native' | 'transparent';
export interface BlobPropertyBag {
  endings?: EndingType;
  type?: string;
}

export interface FilePropertyBag extends BlobPropertyBag {
  lastModified?: number;
}

export type FileFromPathOptions = Omit<FilePropertyBag, 'lastModified'>;

export type FormData = fd.FormData;
export const FormData: typeof fd.FormData;
export type File = fd.File;
export const File: typeof fd.File;
export type Blob = fd.Blob;
export const Blob: typeof fd.Blob;
