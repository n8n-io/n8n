var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// src/util/chunk.ts
var MAX_CHUNK_SIZE = 65536;
function* chunk(value) {
  if (value.byteLength <= MAX_CHUNK_SIZE) {
    yield value;
    return;
  }
  let offset = 0;
  while (offset < value.byteLength) {
    const size = Math.min(value.byteLength - offset, MAX_CHUNK_SIZE);
    const buffer = value.buffer.slice(offset, offset + size);
    offset += buffer.byteLength;
    yield new Uint8Array(buffer);
  }
}

// src/util/createBoundary.ts
var alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
function createBoundary() {
  let size = 16;
  let res = "";
  while (size--) {
    res += alphabet[Math.random() * alphabet.length << 0];
  }
  return res;
}

// src/util/escapeName.ts
var escapeName = (name) => String(name).replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/"/g, "%22");

// src/util/isFunction.ts
var isFunction = (value) => typeof value === "function";

// src/util/isReadableStreamFallback.ts
var isReadableStreamFallback = (value) => !!value && typeof value === "object" && !Array.isArray(value) && isFunction(value.getReader);

// src/util/isAsyncIterable.ts
var isAsyncIterable = (value) => isFunction(value[Symbol.asyncIterator]);

// src/util/getStreamIterator.ts
async function* readStream(readable) {
  const reader = readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    yield value;
  }
}
async function* chunkStream(stream) {
  for await (const value of stream) {
    yield* chunk(value);
  }
}
var getStreamIterator = (source) => {
  if (isAsyncIterable(source)) {
    return chunkStream(source);
  }
  if (isReadableStreamFallback(source)) {
    return chunkStream(readStream(source));
  }
  throw new TypeError(
    "Unsupported data source: Expected either ReadableStream or async iterable."
  );
};

// src/util/isFile.ts
var isFile = (value) => Boolean(
  value && typeof value === "object" && isFunction(value.constructor) && value[Symbol.toStringTag] === "File" && isFunction(value.stream) && value.name != null
);

// src/util/isFormData.ts
var isFormData = (value) => Boolean(
  value && isFunction(value.constructor) && value[Symbol.toStringTag] === "FormData" && isFunction(value.append) && isFunction(value.getAll) && isFunction(value.entries) && isFunction(value[Symbol.iterator])
);

// src/util/isPlainObject.ts
var getType = (value) => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
function isPlainObject(value) {
  if (getType(value) !== "object") {
    return false;
  }
  const pp = Object.getPrototypeOf(value);
  if (pp === null || pp === void 0) {
    return true;
  }
  return pp.constructor?.toString?.() === Object.toString();
}

// src/util/normalizeValue.ts
var normalizeValue = (value) => String(value).replace(/\r|\n/g, (match, i, str) => {
  if (match === "\r" && str[i + 1] !== "\n" || match === "\n" && str[i - 1] !== "\r") {
    return "\r\n";
  }
  return match;
});

// src/util/proxyHeaders.ts
function getProperty(target, prop) {
  if (typeof prop === "string") {
    for (const [name, value] of Object.entries(target)) {
      if (prop.toLowerCase() === name.toLowerCase()) {
        return value;
      }
    }
  }
  return void 0;
}
var proxyHeaders = (object) => new Proxy(
  object,
  {
    get: (target, prop) => getProperty(target, prop),
    has: (target, prop) => getProperty(target, prop) !== void 0
  }
);

// src/FormDataEncoder.ts
var defaultOptions = {
  enableAdditionalHeaders: false
};
var readonlyProp = { writable: false, configurable: false };
var _CRLF, _CRLF_BYTES, _CRLF_BYTES_LENGTH, _DASHES, _encoder, _footer, _form, _options, _FormDataEncoder_instances, getFieldHeader_fn, getContentLength_fn;
var FormDataEncoder = class {
  constructor(form, boundaryOrOptions, options) {
    __privateAdd(this, _FormDataEncoder_instances);
    __privateAdd(this, _CRLF, "\r\n");
    __privateAdd(this, _CRLF_BYTES);
    __privateAdd(this, _CRLF_BYTES_LENGTH);
    __privateAdd(this, _DASHES, "-".repeat(2));
    /**
     * TextEncoder instance
     */
    __privateAdd(this, _encoder, new TextEncoder());
    /**
     * Returns form-data footer bytes
     */
    __privateAdd(this, _footer);
    /**
     * FormData instance
     */
    __privateAdd(this, _form);
    /**
     * Instance options
     */
    __privateAdd(this, _options);
    if (!isFormData(form)) {
      throw new TypeError("Expected first argument to be a FormData instance.");
    }
    let boundary;
    if (isPlainObject(boundaryOrOptions)) {
      options = boundaryOrOptions;
    } else {
      boundary = boundaryOrOptions;
    }
    if (!boundary) {
      boundary = `form-data-encoder-${createBoundary()}`;
    }
    if (typeof boundary !== "string") {
      throw new TypeError("Expected boundary argument to be a string.");
    }
    if (options && !isPlainObject(options)) {
      throw new TypeError("Expected options argument to be an object.");
    }
    __privateSet(this, _form, Array.from(form.entries()));
    __privateSet(this, _options, { ...defaultOptions, ...options });
    __privateSet(this, _CRLF_BYTES, __privateGet(this, _encoder).encode(__privateGet(this, _CRLF)));
    __privateSet(this, _CRLF_BYTES_LENGTH, __privateGet(this, _CRLF_BYTES).byteLength);
    this.boundary = boundary;
    this.contentType = `multipart/form-data; boundary=${this.boundary}`;
    __privateSet(this, _footer, __privateGet(this, _encoder).encode(
      `${__privateGet(this, _DASHES)}${this.boundary}${__privateGet(this, _DASHES)}${__privateGet(this, _CRLF).repeat(2)}`
    ));
    const headers = {
      "Content-Type": this.contentType
    };
    const contentLength = __privateMethod(this, _FormDataEncoder_instances, getContentLength_fn).call(this);
    if (contentLength) {
      this.contentLength = contentLength;
      headers["Content-Length"] = contentLength;
    }
    this.headers = proxyHeaders(Object.freeze(headers));
    Object.defineProperties(this, {
      boundary: readonlyProp,
      contentType: readonlyProp,
      contentLength: readonlyProp,
      headers: readonlyProp
    });
  }
  /**
   * Creates an iterator allowing to go through form-data parts (with metadata).
   * This method **will not** read the files and **will not** split values big into smaller chunks.
   *
   * Using this method, you can convert form-data content into Blob:
   *
   * @example
   *
   * ```ts
   * import {Readable} from "stream"
   *
   * import {FormDataEncoder} from "form-data-encoder"
   *
   * import {FormData} from "formdata-polyfill/esm-min.js"
   * import {fileFrom} from "fetch-blob/form.js"
   * import {File} from "fetch-blob/file.js"
   * import {Blob} from "fetch-blob"
   *
   * import fetch from "node-fetch"
   *
   * const form = new FormData()
   *
   * form.set("field", "Just a random string")
   * form.set("file", new File(["Using files is class amazing"]))
   * form.set("fileFromPath", await fileFrom("path/to/a/file.txt"))
   *
   * const encoder = new FormDataEncoder(form)
   *
   * const options = {
   *   method: "post",
   *   body: new Blob(encoder, {type: encoder.contentType})
   * }
   *
   * const response = await fetch("https://httpbin.org/post", options)
   *
   * console.log(await response.json())
   * ```
   */
  *values() {
    for (const [name, raw] of __privateGet(this, _form)) {
      const value = isFile(raw) ? raw : __privateGet(this, _encoder).encode(normalizeValue(raw));
      yield __privateMethod(this, _FormDataEncoder_instances, getFieldHeader_fn).call(this, name, value);
      yield value;
      yield __privateGet(this, _CRLF_BYTES);
    }
    yield __privateGet(this, _footer);
  }
  /**
   * Creates an async iterator allowing to perform the encoding by portions.
   * This method reads through files and splits big values into smaller pieces (65536 bytes per each).
   *
   * @example
   *
   * ```ts
   * import {Readable} from "stream"
   *
   * import {FormData, File, fileFromPath} from "formdata-node"
   * import {FormDataEncoder} from "form-data-encoder"
   *
   * import fetch from "node-fetch"
   *
   * const form = new FormData()
   *
   * form.set("field", "Just a random string")
   * form.set("file", new File(["Using files is class amazing"], "file.txt"))
   * form.set("fileFromPath", await fileFromPath("path/to/a/file.txt"))
   *
   * const encoder = new FormDataEncoder(form)
   *
   * const options = {
   *   method: "post",
   *   headers: encoder.headers,
   *   body: Readable.from(encoder.encode()) // or Readable.from(encoder)
   * }
   *
   * const response = await fetch("https://httpbin.org/post", options)
   *
   * console.log(await response.json())
   * ```
   */
  async *encode() {
    for (const part of this.values()) {
      if (isFile(part)) {
        yield* getStreamIterator(part.stream());
      } else {
        yield* chunk(part);
      }
    }
  }
  /**
   * Creates an iterator allowing to read through the encoder data using for...of loops
   */
  [Symbol.iterator]() {
    return this.values();
  }
  /**
   * Creates an **async** iterator allowing to read through the encoder data using for-await...of loops
   */
  [Symbol.asyncIterator]() {
    return this.encode();
  }
};
_CRLF = new WeakMap();
_CRLF_BYTES = new WeakMap();
_CRLF_BYTES_LENGTH = new WeakMap();
_DASHES = new WeakMap();
_encoder = new WeakMap();
_footer = new WeakMap();
_form = new WeakMap();
_options = new WeakMap();
_FormDataEncoder_instances = new WeakSet();
getFieldHeader_fn = function(name, value) {
  let header = "";
  header += `${__privateGet(this, _DASHES)}${this.boundary}${__privateGet(this, _CRLF)}`;
  header += `Content-Disposition: form-data; name="${escapeName(name)}"`;
  if (isFile(value)) {
    header += `; filename="${escapeName(value.name)}"${__privateGet(this, _CRLF)}`;
    header += `Content-Type: ${value.type || "application/octet-stream"}`;
  }
  if (__privateGet(this, _options).enableAdditionalHeaders === true) {
    const size = isFile(value) ? value.size : value.byteLength;
    if (size != null && !isNaN(size)) {
      header += `${__privateGet(this, _CRLF)}Content-Length: ${size}`;
    }
  }
  return __privateGet(this, _encoder).encode(`${header}${__privateGet(this, _CRLF).repeat(2)}`);
};
/**
 * Returns form-data content length
 */
getContentLength_fn = function() {
  let length = 0;
  for (const [name, raw] of __privateGet(this, _form)) {
    const value = isFile(raw) ? raw : __privateGet(this, _encoder).encode(normalizeValue(raw));
    const size = isFile(value) ? value.size : value.byteLength;
    if (size == null || isNaN(size)) {
      return void 0;
    }
    length += __privateMethod(this, _FormDataEncoder_instances, getFieldHeader_fn).call(this, name, value).byteLength;
    length += size;
    length += __privateGet(this, _CRLF_BYTES_LENGTH);
  }
  return String(length + __privateGet(this, _footer).byteLength);
};
export {
  FormDataEncoder,
  isFile,
  isFormData
};
