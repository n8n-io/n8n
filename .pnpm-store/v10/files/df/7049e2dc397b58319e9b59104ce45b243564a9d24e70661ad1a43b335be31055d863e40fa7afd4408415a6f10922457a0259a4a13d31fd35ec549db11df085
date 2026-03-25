import { type RequestOptions } from "./core.js";
import {
  FormData,
  File,
  type Blob,
  type FilePropertyBag,
  getMultipartRequestOptions,
  type FsReadStream,
  isFsReadStream,
} from "./_shims/index.js";
import { MultipartBody } from "./_shims/MultipartBody.js";
export { fileFromPath } from "./_shims/index.js";

type BlobLikePart = string | ArrayBuffer | ArrayBufferView | BlobLike | Uint8Array | DataView;
export type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob | Uint8Array | DataView;

/**
 * Typically, this is a native "File" class.
 *
 * We provide the {@link toFile} utility to convert a variety of objects
 * into the File class.
 *
 * For convenience, you can also pass a fetch Response, or in Node,
 * the result of fs.createReadStream().
 */
export type Uploadable = FileLike | ResponseLike | FsReadStream;

/**
 * Intended to match web.Blob, node.Blob, node-fetch.Blob, etc.
 */
export interface BlobLike {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/size) */
  readonly size: number;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/type) */
  readonly type: string;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/text) */
  text(): Promise<string>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/slice) */
  slice(start?: number, end?: number): BlobLike;
  // unfortunately @types/node-fetch@^2.6.4 doesn't type the arrayBuffer method
}

/**
 * Intended to match web.File, node.File, node-fetch.File, etc.
 */
export interface FileLike extends BlobLike {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/File/lastModified) */
  readonly lastModified: number;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/File/name) */
  readonly name: string;
}

/**
 * Intended to match web.Response, node.Response, node-fetch.Response, etc.
 */
export interface ResponseLike {
  url: string;
  blob(): Promise<BlobLike>;
}

export const isResponseLike = (value: any): value is ResponseLike =>
  value != null &&
  typeof value === 'object' &&
  typeof value.url === 'string' &&
  typeof value.blob === 'function';

export const isFileLike = (value: any): value is FileLike =>
  value != null &&
  typeof value === 'object' &&
  typeof value.name === 'string' &&
  typeof value.lastModified === 'number' &&
  isBlobLike(value);

/**
 * The BlobLike type omits arrayBuffer() because @types/node-fetch@^2.6.4 lacks it; but this check
 * adds the arrayBuffer() method type because it is available and used at runtime
 */
export const isBlobLike = (value: any): value is BlobLike & { arrayBuffer(): Promise<ArrayBuffer> } =>
  value != null &&
  typeof value === 'object' &&
  typeof value.size === 'number' &&
  typeof value.type === 'string' &&
  typeof value.text === 'function' &&
  typeof value.slice === 'function' &&
  typeof value.arrayBuffer === 'function';

export const isUploadable = (value: any): value is Uploadable => {
  return isFileLike(value) || isResponseLike(value) || isFsReadStream(value);
};

export type ToFileInput = Uploadable | Exclude<BlobLikePart, string> | AsyncIterable<BlobLikePart>;

/**
 * Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
 * @param value the raw content of the file.  Can be an {@link Uploadable}, {@link BlobLikePart}, or {@link AsyncIterable} of {@link BlobLikePart}s
 * @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
 * @param {Object=} options additional properties
 * @param {string=} options.type the MIME type of the content
 * @param {number=} options.lastModified the last modified timestamp
 * @returns a {@link File} with the given properties
 */
export async function toFile(
  value: ToFileInput | PromiseLike<ToFileInput>,
  name?: string | null | undefined,
  options?: FilePropertyBag | undefined,
): Promise<FileLike> {
  // If it's a promise, resolve it.
  value = await value;

  // If we've been given a `File` we don't need to do anything
  if (isFileLike(value)) {
    return value;
  }

  if (isResponseLike(value)) {
    const blob = await value.blob();
    name ||= new URL(value.url).pathname.split(/[\\/]/).pop() ?? 'unknown_file';

    // we need to convert the `Blob` into an array buffer because the `Blob` class
    // that `node-fetch` defines is incompatible with the web standard which results
    // in `new File` interpreting it as a string instead of binary data.
    const data = isBlobLike(blob) ? [(await blob.arrayBuffer()) as any] : [blob];

    return new File(data, name, options);
  }

  const bits = await getBytes(value);

  name ||= getName(value) ?? 'unknown_file';

  if (!options?.type) {
    const type = (bits[0] as any)?.type;
    if (typeof type === 'string') {
      options = { ...options, type };
    }
  }

  return new File(bits, name, options);
}

async function getBytes(value: ToFileInput): Promise<Array<BlobPart>> {
  let parts: Array<BlobPart> = [];
  if (
    typeof value === 'string' ||
    ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
    value instanceof ArrayBuffer
  ) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(await value.arrayBuffer());
  } else if (
    isAsyncIterableIterator(value) // includes Readable, ReadableStream, etc.
  ) {
    for await (const chunk of value) {
      parts.push(chunk as BlobPart); // TODO, consider validating?
    }
  } else {
    throw new Error(
      `Unexpected data type: ${typeof value}; constructor: ${value?.constructor
        ?.name}; props: ${propsForError(value)}`,
    );
  }

  return parts;
}

function propsForError(value: any): string {
  const props = Object.getOwnPropertyNames(value);
  return `[${props.map((p) => `"${p}"`).join(', ')}]`;
}

function getName(value: any): string | undefined {
  return (
    getStringFromMaybeBuffer(value.name) ||
    getStringFromMaybeBuffer(value.filename) ||
    // For fs.ReadStream
    getStringFromMaybeBuffer(value.path)?.split(/[\\/]/).pop()
  );
}

const getStringFromMaybeBuffer = (x: string | Buffer | unknown): string | undefined => {
  if (typeof x === 'string') return x;
  if (typeof Buffer !== 'undefined' && x instanceof Buffer) return String(x);
  return undefined;
};

const isAsyncIterableIterator = (value: any): value is AsyncIterableIterator<unknown> =>
  value != null && typeof value === 'object' && typeof value[Symbol.asyncIterator] === 'function';

export const isMultipartBody = (body: any): body is MultipartBody =>
  body && typeof body === 'object' && body.body && body[Symbol.toStringTag] === 'MultipartBody';

/**
 * Returns a multipart/form-data request if any part of the given request body contains a File / Blob value.
 * Otherwise returns the request as is.
 */
export const maybeMultipartFormRequestOptions = async <T = Record<string, unknown>>(
  opts: RequestOptions<T>,
): Promise<RequestOptions<T | MultipartBody>> => {
  if (!hasUploadableValue(opts.body)) return opts;

  const form = await createForm(opts.body);
  return getMultipartRequestOptions(form, opts);
};

export const multipartFormRequestOptions = async <T = Record<string, unknown>>(
  opts: RequestOptions<T>,
): Promise<RequestOptions<T | MultipartBody>> => {
  const form = await createForm(opts.body);
  return getMultipartRequestOptions(form, opts);
};

export const createForm = async <T = Record<string, unknown>>(body: T | undefined): Promise<FormData> => {
  const form = new FormData();
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};

const hasUploadableValue = (value: unknown): boolean => {
  if (isUploadable(value)) return true;
  if (Array.isArray(value)) return value.some(hasUploadableValue);
  if (value && typeof value === 'object') {
    for (const k in value) {
      if (hasUploadableValue((value as any)[k])) return true;
    }
  }
  return false;
};

const addFormValue = async (form: FormData, key: string, value: unknown): Promise<void> => {
  if (value === undefined) return;
  if (value == null) {
    throw new TypeError(
      `Received null for "${key}"; to pass null in FormData, you must use the string 'null'`,
    );
  }

  // TODO: make nested formats configurable
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    form.append(key, String(value));
  } else if (isUploadable(value)) {
    const file = await toFile(value);
    form.append(key, file as File);
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + '[]', entry)));
  } else if (typeof value === 'object') {
    await Promise.all(
      Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)),
    );
  } else {
    throw new TypeError(
      `Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`,
    );
  }
};
