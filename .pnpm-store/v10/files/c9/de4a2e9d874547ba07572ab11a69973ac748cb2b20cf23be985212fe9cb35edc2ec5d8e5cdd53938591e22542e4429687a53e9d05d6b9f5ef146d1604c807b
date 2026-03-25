var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// src/isFunction.ts
var isFunction = (value) => typeof value === "function";

// src/isObject.ts
var isObject = (value) => typeof value === "object" && value != null && !Array.isArray(value);

// src/isAsyncIterable.ts
var isAsyncIterable = (value) => isObject(value) && isFunction(value[Symbol.asyncIterator]);

// src/blobHelpers.ts
var MAX_CHUNK_SIZE = 65536;
async function* clonePart(value) {
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
    yield* clonePart(value);
  }
}
var getStreamIterator = (source) => {
  if (isAsyncIterable(source)) {
    return chunkStream(source);
  }
  if (isFunction(source.getReader)) {
    return chunkStream(readStream(source));
  }
  throw new TypeError(
    "Unsupported data source: Expected either ReadableStream or async iterable."
  );
};
async function* consumeNodeBlob(blob) {
  let position = 0;
  while (position !== blob.size) {
    const chunk = blob.slice(
      position,
      Math.min(blob.size, position + MAX_CHUNK_SIZE)
    );
    const buffer = await chunk.arrayBuffer();
    position += buffer.byteLength;
    yield new Uint8Array(buffer);
  }
}
async function* consumeBlobParts(parts, clone = false) {
  for (const part of parts) {
    if (ArrayBuffer.isView(part)) {
      if (clone) {
        yield* clonePart(part);
      } else {
        yield part;
      }
    } else if (isFunction(part.stream)) {
      yield* getStreamIterator(part.stream());
    } else {
      yield* consumeNodeBlob(part);
    }
  }
}
function* sliceBlob(blobParts, blobSize, start = 0, end) {
  end ??= blobSize;
  let relativeStart = start < 0 ? Math.max(blobSize + start, 0) : Math.min(start, blobSize);
  let relativeEnd = end < 0 ? Math.max(blobSize + end, 0) : Math.min(end, blobSize);
  const span = Math.max(relativeEnd - relativeStart, 0);
  let added = 0;
  for (const part of blobParts) {
    if (added >= span) {
      break;
    }
    const partSize = ArrayBuffer.isView(part) ? part.byteLength : part.size;
    if (relativeStart && partSize <= relativeStart) {
      relativeStart -= partSize;
      relativeEnd -= partSize;
    } else {
      let chunk;
      if (ArrayBuffer.isView(part)) {
        chunk = part.subarray(relativeStart, Math.min(partSize, relativeEnd));
        added += chunk.byteLength;
      } else {
        chunk = part.slice(relativeStart, Math.min(partSize, relativeEnd));
        added += chunk.size;
      }
      relativeEnd -= partSize;
      relativeStart = 0;
      yield chunk;
    }
  }
}

// src/Blob.ts
var _parts, _type, _size;
var _Blob = class _Blob {
  /**
   * Returns a new [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) object.
   * The content of the blob consists of the concatenation of the values given in the parameter array.
   *
   * @param blobParts An `Array` strings, or [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
   * @param options An optional object of type `BlobPropertyBag`.
   */
  constructor(blobParts = [], options = {}) {
    /**
     * An `Array` of [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView) or [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
     */
    __privateAdd(this, _parts, []);
    /**
     * Returns the [`MIME type`](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type) of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
     */
    __privateAdd(this, _type, "");
    /**
     * Returns the size of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) in bytes.
     */
    __privateAdd(this, _size, 0);
    options ??= {};
    if (typeof blobParts !== "object" || blobParts === null) {
      throw new TypeError(
        "Failed to construct 'Blob': The provided value cannot be converted to a sequence."
      );
    }
    if (!isFunction(blobParts[Symbol.iterator])) {
      throw new TypeError(
        "Failed to construct 'Blob': The object must have a callable @@iterator property."
      );
    }
    if (typeof options !== "object" && !isFunction(options)) {
      throw new TypeError(
        "Failed to construct 'Blob': parameter 2 cannot convert to dictionary."
      );
    }
    const encoder = new TextEncoder();
    for (const raw of blobParts) {
      let part;
      if (ArrayBuffer.isView(raw)) {
        part = new Uint8Array(raw.buffer.slice(
          raw.byteOffset,
          raw.byteOffset + raw.byteLength
        ));
      } else if (raw instanceof ArrayBuffer) {
        part = new Uint8Array(raw.slice(0));
      } else if (raw instanceof _Blob) {
        part = raw;
      } else {
        part = encoder.encode(String(raw));
      }
      __privateSet(this, _size, __privateGet(this, _size) + (ArrayBuffer.isView(part) ? part.byteLength : part.size));
      __privateGet(this, _parts).push(part);
    }
    const type = options.type === void 0 ? "" : String(options.type);
    __privateSet(this, _type, /^[\x20-\x7E]*$/.test(type) ? type : "");
  }
  static [Symbol.hasInstance](value) {
    return Boolean(
      value && typeof value === "object" && isFunction(value.constructor) && (isFunction(value.stream) || isFunction(value.arrayBuffer)) && /^(Blob|File)$/.test(value[Symbol.toStringTag])
    );
  }
  /**
   * Returns the [`MIME type`](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type) of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
   */
  get type() {
    return __privateGet(this, _type);
  }
  /**
   * Returns the size of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) in bytes.
   */
  get size() {
    return __privateGet(this, _size);
  }
  /**
   * Creates and returns a new [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) object which contains data from a subset of the blob on which it's called.
   *
   * @param start An index into the Blob indicating the first byte to include in the new Blob. If you specify a negative value, it's treated as an offset from the end of the Blob toward the beginning. For example, -10 would be the 10th from last byte in the Blob. The default value is 0. If you specify a value for start that is larger than the size of the source Blob, the returned Blob has size 0 and contains no data.
   * @param end An index into the Blob indicating the first byte that will *not* be included in the new Blob (i.e. the byte exactly at this index is not included). If you specify a negative value, it's treated as an offset from the end of the Blob toward the beginning. For example, -10 would be the 10th from last byte in the Blob. The default value is size.
   * @param contentType The content type to assign to the new Blob; this will be the value of its type property. The default value is an empty string.
   */
  slice(start, end, contentType) {
    return new _Blob(sliceBlob(__privateGet(this, _parts), this.size, start, end), {
      type: contentType
    });
  }
  /**
   * Returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves with a string containing the contents of the blob, interpreted as UTF-8.
   */
  async text() {
    const decoder = new TextDecoder();
    let result = "";
    for await (const chunk of consumeBlobParts(__privateGet(this, _parts))) {
      result += decoder.decode(chunk, { stream: true });
    }
    result += decoder.decode();
    return result;
  }
  /**
   * Returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves with the contents of the blob as binary data contained in an [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).
   */
  async arrayBuffer() {
    const view = new Uint8Array(this.size);
    let offset = 0;
    for await (const chunk of consumeBlobParts(__privateGet(this, _parts))) {
      view.set(chunk, offset);
      offset += chunk.length;
    }
    return view.buffer;
  }
  /**
   * Returns a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) which upon reading returns the data contained within the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
   */
  stream() {
    const iterator = consumeBlobParts(__privateGet(this, _parts), true);
    return new ReadableStream({
      async pull(controller) {
        const { value, done } = await iterator.next();
        if (done) {
          return queueMicrotask(() => controller.close());
        }
        controller.enqueue(value);
      },
      async cancel() {
        await iterator.return();
      }
    });
  }
  get [Symbol.toStringTag]() {
    return "Blob";
  }
};
_parts = new WeakMap();
_type = new WeakMap();
_size = new WeakMap();
var Blob = _Blob;
Object.defineProperties(Blob.prototype, {
  type: { enumerable: true },
  size: { enumerable: true },
  slice: { enumerable: true },
  stream: { enumerable: true },
  text: { enumerable: true },
  arrayBuffer: { enumerable: true }
});

// src/isBlob.ts
var isBlob = (value) => value instanceof Blob;

// src/File.ts
var _name, _lastModified;
var File = class extends Blob {
  /**
   * Creates a new File instance.
   *
   * @param fileBits An `Array` strings, or [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
   * @param name The name of the file.
   * @param options An options object containing optional attributes for the file.
   */
  constructor(fileBits, name, options = {}) {
    super(fileBits, options);
    /**
     * Returns the name of the file referenced by the File object.
     */
    __privateAdd(this, _name, void 0);
    /**
     * The last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date.
     */
    __privateAdd(this, _lastModified, 0);
    if (arguments.length < 2) {
      throw new TypeError(
        `Failed to construct 'File': 2 arguments required, but only ${arguments.length} present.`
      );
    }
    __privateSet(this, _name, String(name));
    const lastModified = options.lastModified === void 0 ? Date.now() : Number(options.lastModified);
    if (!Number.isNaN(lastModified)) {
      __privateSet(this, _lastModified, lastModified);
    }
  }
  static [Symbol.hasInstance](value) {
    return value instanceof Blob && value[Symbol.toStringTag] === "File" && typeof value.name === "string";
  }
  /**
   * Name of the file referenced by the File object.
   */
  get name() {
    return __privateGet(this, _name);
  }
  /* c8 ignore next 3 */
  get webkitRelativePath() {
    return "";
  }
  /**
   * The last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date.
   */
  get lastModified() {
    return __privateGet(this, _lastModified);
  }
  get [Symbol.toStringTag]() {
    return "File";
  }
};
_name = new WeakMap();
_lastModified = new WeakMap();

// src/isFile.ts
var isFile = (value) => value instanceof File;

// src/FormData.ts
var _entries, _setEntry, setEntry_fn;
var FormData = class {
  constructor() {
    __privateAdd(this, _setEntry);
    /**
     * Stores internal data for every entry
     */
    __privateAdd(this, _entries, /* @__PURE__ */ new Map());
  }
  static [Symbol.hasInstance](value) {
    if (!value) {
      return false;
    }
    const val = value;
    return Boolean(
      isFunction(val.constructor) && val[Symbol.toStringTag] === "FormData" && isFunction(val.append) && isFunction(val.set) && isFunction(val.get) && isFunction(val.getAll) && isFunction(val.has) && isFunction(val.delete) && isFunction(val.entries) && isFunction(val.values) && isFunction(val.keys) && isFunction(val[Symbol.iterator]) && isFunction(val.forEach)
    );
  }
  /**
   * Appends a new value onto an existing key inside a FormData object,
   * or adds the key if it does not already exist.
   *
   * The difference between `set()` and `append()` is that if the specified key already exists, `set()` will overwrite all existing values with the new one, whereas `append()` will append the new value onto the end of the existing set of values.
   *
   * @param name The name of the field whose data is contained in `value`.
   * @param value The field's value. This can be [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
    or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File). If none of these are specified the value is converted to a string.
   * @param fileName The filename reported to the server, when a Blob or File is passed as the second parameter. The default filename for Blob objects is "blob". The default filename for File objects is the file's filename.
   */
  append(name, value, fileName) {
    __privateMethod(this, _setEntry, setEntry_fn).call(this, {
      name,
      fileName,
      append: true,
      rawValue: value,
      argsLength: arguments.length
    });
  }
  /**
   * Set a new value for an existing key inside FormData,
   * or add the new field if it does not already exist.
   *
   * @param name The name of the field whose data is contained in `value`.
   * @param value The field's value. This can be [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
    or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File). If none of these are specified the value is converted to a string.
   * @param fileName The filename reported to the server, when a Blob or File is passed as the second parameter. The default filename for Blob objects is "blob". The default filename for File objects is the file's filename.
   *
   */
  set(name, value, fileName) {
    __privateMethod(this, _setEntry, setEntry_fn).call(this, {
      name,
      fileName,
      append: false,
      rawValue: value,
      argsLength: arguments.length
    });
  }
  /**
   * Returns the first value associated with a given key from within a `FormData` object.
   * If you expect multiple values and want all of them, use the `getAll()` method instead.
   *
   * @param {string} name A name of the value you want to retrieve.
   *
   * @returns A `FormDataEntryValue` containing the value. If the key doesn't exist, the method returns null.
   */
  get(name) {
    const field = __privateGet(this, _entries).get(String(name));
    if (!field) {
      return null;
    }
    return field[0];
  }
  /**
   * Returns all the values associated with a given key from within a `FormData` object.
   *
   * @param {string} name A name of the value you want to retrieve.
   *
   * @returns An array of `FormDataEntryValue` whose key matches the value passed in the `name` parameter. If the key doesn't exist, the method returns an empty list.
   */
  getAll(name) {
    const field = __privateGet(this, _entries).get(String(name));
    if (!field) {
      return [];
    }
    return field.slice();
  }
  /**
   * Returns a boolean stating whether a `FormData` object contains a certain key.
   *
   * @param name A string representing the name of the key you want to test for.
   *
   * @return A boolean value.
   */
  has(name) {
    return __privateGet(this, _entries).has(String(name));
  }
  /**
   * Deletes a key and its value(s) from a `FormData` object.
   *
   * @param name The name of the key you want to delete.
   */
  delete(name) {
    __privateGet(this, _entries).delete(String(name));
  }
  /**
   * Returns an [`iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through all keys contained in this `FormData` object.
   * Each key is a `string`.
   */
  *keys() {
    for (const key of __privateGet(this, _entries).keys()) {
      yield key;
    }
  }
  /**
   * Returns an [`iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through the `FormData` key/value pairs.
   * The key of each pair is a string; the value is a [`FormDataValue`](https://developer.mozilla.org/en-US/docs/Web/API/FormDataEntryValue).
   */
  *entries() {
    for (const name of this.keys()) {
      const values = this.getAll(name);
      for (const value of values) {
        yield [name, value];
      }
    }
  }
  /**
   * Returns an [`iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through all values contained in this object `FormData` object.
   * Each value is a [`FormDataValue`](https://developer.mozilla.org/en-US/docs/Web/API/FormDataEntryValue).
   */
  *values() {
    for (const [, value] of this) {
      yield value;
    }
  }
  /**
   * An alias for FormData#entries()
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * Executes given callback function for each field of the FormData instance
   */
  forEach(callback, thisArg) {
    for (const [name, value] of this) {
      callback.call(thisArg, value, name, this);
    }
  }
  get [Symbol.toStringTag]() {
    return "FormData";
  }
};
_entries = new WeakMap();
_setEntry = new WeakSet();
setEntry_fn = function({
  name,
  rawValue,
  append,
  fileName,
  argsLength
}) {
  const methodName = append ? "append" : "set";
  if (argsLength < 2) {
    throw new TypeError(
      `Failed to execute '${methodName}' on 'FormData': 2 arguments required, but only ${argsLength} present.`
    );
  }
  name = String(name);
  let value;
  if (isFile(rawValue)) {
    value = fileName === void 0 ? rawValue : new File([rawValue], fileName, {
      // otherwise, create new File with given fileName
      type: rawValue.type,
      lastModified: rawValue.lastModified
    });
  } else if (isBlob(rawValue)) {
    value = new File([rawValue], fileName === void 0 ? "blob" : fileName, {
      type: rawValue.type
    });
  } else if (fileName) {
    throw new TypeError(
      `Failed to execute '${methodName}' on 'FormData': parameter 2 is not of type 'Blob'.`
    );
  } else {
    value = String(rawValue);
  }
  const values = __privateGet(this, _entries).get(name);
  if (!values) {
    return void __privateGet(this, _entries).set(name, [value]);
  }
  if (!append) {
    return void __privateGet(this, _entries).set(name, [value]);
  }
  values.push(value);
};
export {
  Blob,
  File,
  FormData
};
/*! Based on fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> & David Frank */
