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
  getMultipartRequestOptions: <T = Record<string, unknown>>(
    form: Shims['FormData'],
    opts: RequestOptions<T>,
  ) => Promise<RequestOptions<T>>;
  getDefaultAgent: (url: string) => any;
  fileFromPath:
    | ((path: string, filename?: string, options?: {}) => Promise<Shims['File']>)
    | ((path: string, options?: {}) => Promise<Shims['File']>);
  isFsReadStream: (value: any) => boolean;
}

export let auto = false;
export let kind: Shims['kind'] | undefined = undefined;
export let fetch: Shims['fetch'] | undefined = undefined;
export let Request: Shims['Request'] | undefined = undefined;
export let Response: Shims['Response'] | undefined = undefined;
export let Headers: Shims['Headers'] | undefined = undefined;
export let FormData: Shims['FormData'] | undefined = undefined;
export let Blob: Shims['Blob'] | undefined = undefined;
export let File: Shims['File'] | undefined = undefined;
export let ReadableStream: Shims['ReadableStream'] | undefined = undefined;
export let getMultipartRequestOptions: Shims['getMultipartRequestOptions'] | undefined = undefined;
export let getDefaultAgent: Shims['getDefaultAgent'] | undefined = undefined;
export let fileFromPath: Shims['fileFromPath'] | undefined = undefined;
export let isFsReadStream: Shims['isFsReadStream'] | undefined = undefined;

export function setShims(shims: Shims, options: { auto: boolean } = { auto: false }) {
  if (auto) {
    throw new Error(
      `you must \`import '@anthropic-ai/sdk/shims/${shims.kind}'\` before importing anything else from @anthropic-ai/sdk`,
    );
  }
  if (kind) {
    throw new Error(
      `can't \`import '@anthropic-ai/sdk/shims/${shims.kind}'\` after \`import '@anthropic-ai/sdk/shims/${kind}'\``,
    );
  }
  auto = options.auto;
  kind = shims.kind;
  fetch = shims.fetch;
  Request = shims.Request;
  Response = shims.Response;
  Headers = shims.Headers;
  FormData = shims.FormData;
  Blob = shims.Blob;
  File = shims.File;
  ReadableStream = shims.ReadableStream;
  getMultipartRequestOptions = shims.getMultipartRequestOptions;
  getDefaultAgent = shims.getDefaultAgent;
  fileFromPath = shims.fileFromPath;
  isFsReadStream = shims.isFsReadStream;
}
