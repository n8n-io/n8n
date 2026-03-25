/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
import { manual } from "./manual-types.js";
import * as auto from "./auto/types.js";
import { type RequestOptions } from "../core.js";

type SelectType<Manual, Auto> = unknown extends Manual ? Auto : Manual;

export const kind: string;

// @ts-ignore
export type Agent = SelectType<manual.Agent, auto.Agent>;

// @ts-ignore
export const fetch: SelectType<typeof manual.fetch, typeof auto.fetch>;

// @ts-ignore
export type Request = SelectType<manual.Request, auto.Request>;
// @ts-ignore
export type RequestInfo = SelectType<manual.RequestInfo, auto.RequestInfo>;
// @ts-ignore
export type RequestInit = SelectType<manual.RequestInit, auto.RequestInit>;

// @ts-ignore
export type Response = SelectType<manual.Response, auto.Response>;
// @ts-ignore
export type ResponseInit = SelectType<manual.ResponseInit, auto.ResponseInit>;
// @ts-ignore
export type ResponseType = SelectType<manual.ResponseType, auto.ResponseType>;
// @ts-ignore
export type BodyInit = SelectType<manual.BodyInit, auto.BodyInit>;
// @ts-ignore
export type Headers = SelectType<manual.Headers, auto.Headers>;
// @ts-ignore
export const Headers: SelectType<typeof manual.Headers, typeof auto.Headers>;
// @ts-ignore
export type HeadersInit = SelectType<manual.HeadersInit, auto.HeadersInit>;

// @ts-ignore
export type BlobPropertyBag = SelectType<manual.BlobPropertyBag, auto.BlobPropertyBag>;
// @ts-ignore
export type FilePropertyBag = SelectType<manual.FilePropertyBag, auto.FilePropertyBag>;
// @ts-ignore
export type FileFromPathOptions = SelectType<manual.FileFromPathOptions, auto.FileFromPathOptions>;
// @ts-ignore
export type FormData = SelectType<manual.FormData, auto.FormData>;
// @ts-ignore
export const FormData: SelectType<typeof manual.FormData, typeof auto.FormData>;
// @ts-ignore
export type File = SelectType<manual.File, auto.File>;
// @ts-ignore
export const File: SelectType<typeof manual.File, typeof auto.File>;
// @ts-ignore
export type Blob = SelectType<manual.Blob, auto.Blob>;
// @ts-ignore
export const Blob: SelectType<typeof manual.Blob, typeof auto.Blob>;

// @ts-ignore
export type Readable = SelectType<manual.Readable, auto.Readable>;
// @ts-ignore
export type FsReadStream = SelectType<manual.FsReadStream, auto.FsReadStream>;
// @ts-ignore
export type ReadableStream = SelectType<manual.ReadableStream, auto.ReadableStream>;
// @ts-ignore
export const ReadableStream: SelectType<typeof manual.ReadableStream, typeof auto.ReadableStream>;

export function getMultipartRequestOptions<T = Record<string, unknown>>(
  form: FormData,
  opts: RequestOptions<T>,
): Promise<RequestOptions<T>>;

export function getDefaultAgent(url: string): any;

// @ts-ignore
export type FileFromPathOptions = SelectType<manual.FileFromPathOptions, auto.FileFromPathOptions>;

export function fileFromPath(path: string, options?: FileFromPathOptions): Promise<File>;
export function fileFromPath(path: string, filename?: string, options?: FileFromPathOptions): Promise<File>;

export function isFsReadStream(value: any): value is FsReadStream;
