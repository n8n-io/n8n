// GENERATED FILE. DO NOT EDIT.
var loader = (function(exports) {
  "use strict";
  
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  exports.demangle = demangle;
  exports.instantiate = instantiate;
  exports.instantiateStreaming = instantiateStreaming;
  exports.instantiateSync = instantiateSync;
  // Runtime header offsets
  const ID_OFFSET = -8;
  const SIZE_OFFSET = -4; // Runtime ids
  
  const ARRAYBUFFER_ID = 0;
  const STRING_ID = 1; // const ARRAYBUFFERVIEW_ID = 2;
  // Runtime type information
  
  const ARRAYBUFFERVIEW = 1 << 0;
  const ARRAY = 1 << 1;
  const STATICARRAY = 1 << 2; // const SET = 1 << 3;
  // const MAP = 1 << 4;
  
  const VAL_ALIGN_OFFSET = 6; // const VAL_ALIGN = 1 << VAL_ALIGN_OFFSET;
  
  const VAL_SIGNED = 1 << 11;
  const VAL_FLOAT = 1 << 12; // const VAL_NULLABLE = 1 << 13;
  
  const VAL_MANAGED = 1 << 14; // const KEY_ALIGN_OFFSET = 15;
  // const KEY_ALIGN = 1 << KEY_ALIGN_OFFSET;
  // const KEY_SIGNED = 1 << 20;
  // const KEY_FLOAT = 1 << 21;
  // const KEY_NULLABLE = 1 << 22;
  // const KEY_MANAGED = 1 << 23;
  // Array(BufferView) layout
  
  const ARRAYBUFFERVIEW_BUFFER_OFFSET = 0;
  const ARRAYBUFFERVIEW_DATASTART_OFFSET = 4;
  const ARRAYBUFFERVIEW_BYTELENGTH_OFFSET = 8;
  const ARRAYBUFFERVIEW_SIZE = 12;
  const ARRAY_LENGTH_OFFSET = 12;
  const ARRAY_SIZE = 16;
  const E_NO_EXPORT_TABLE = "Operation requires compiling with --exportTable";
  const E_NO_EXPORT_RUNTIME = "Operation requires compiling with --exportRuntime";
  
  const F_NO_EXPORT_RUNTIME = () => {
    throw Error(E_NO_EXPORT_RUNTIME);
  };
  
  const BIGINT = typeof BigUint64Array !== "undefined";
  const THIS = Symbol();
  const STRING_SMALLSIZE = 192; // break-even point in V8
  
  const STRING_CHUNKSIZE = 1024; // mitigate stack overflow
  
  const utf16 = new TextDecoder("utf-16le", {
    fatal: true
  }); // != wtf16
  
  /** polyfill for Object.hasOwn */
  
  Object.hasOwn = Object.hasOwn || function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
  /** Gets a string from memory. */
  
  
  function getStringImpl(buffer, ptr) {
    let len = new Uint32Array(buffer)[ptr + SIZE_OFFSET >>> 2] >>> 1;
    const wtf16 = new Uint16Array(buffer, ptr, len);
    if (len <= STRING_SMALLSIZE) return String.fromCharCode(...wtf16);
  
    try {
      return utf16.decode(wtf16);
    } catch {
      let str = "",
          off = 0;
  
      while (len - off > STRING_CHUNKSIZE) {
        str += String.fromCharCode(...wtf16.subarray(off, off += STRING_CHUNKSIZE));
      }
  
      return str + String.fromCharCode(...wtf16.subarray(off));
    }
  }
  /** Prepares the base module prior to instantiation. */
  
  
  function preInstantiate(imports) {
    const extendedExports = {};
  
    function getString(memory, ptr) {
      if (!memory) return "<yet unknown>";
      return getStringImpl(memory.buffer, ptr);
    } // add common imports used by stdlib for convenience
  
  
    const env = imports.env = imports.env || {};
  
    env.abort = env.abort || function abort(msg, file, line, colm) {
      const memory = extendedExports.memory || env.memory; // prefer exported, otherwise try imported
  
      throw Error(`abort: ${getString(memory, msg)} at ${getString(memory, file)}:${line}:${colm}`);
    };
  
    env.trace = env.trace || function trace(msg, n, ...args) {
      const memory = extendedExports.memory || env.memory;
      console.log(`trace: ${getString(memory, msg)}${n ? " " : ""}${args.slice(0, n).join(", ")}`);
    };
  
    env.seed = env.seed || Date.now;
    imports.Math = imports.Math || Math;
    imports.Date = imports.Date || Date;
    return extendedExports;
  }
  /** Prepares the final module once instantiation is complete. */
  
  
  function postInstantiate(extendedExports, instance) {
    const exports = instance.exports;
    const memory = exports.memory;
    const table = exports.table;
  
    const __new = exports.__new || F_NO_EXPORT_RUNTIME;
  
    const __pin = exports.__pin || F_NO_EXPORT_RUNTIME;
  
    const __unpin = exports.__unpin || F_NO_EXPORT_RUNTIME;
  
    const __collect = exports.__collect || F_NO_EXPORT_RUNTIME;
  
    const __rtti_base = exports.__rtti_base;
    const getRttiCount = __rtti_base ? arr => arr[__rtti_base >>> 2] : F_NO_EXPORT_RUNTIME;
    extendedExports.__new = __new;
    extendedExports.__pin = __pin;
    extendedExports.__unpin = __unpin;
    extendedExports.__collect = __collect;
    /** Gets the runtime type info for the given id. */
  
    function getRttInfo(id) {
      const U32 = new Uint32Array(memory.buffer);
      if ((id >>>= 0) >= getRttiCount(U32)) throw Error(`invalid id: ${id}`);
      return U32[(__rtti_base + 4 >>> 2) + (id << 1)];
    }
    /** Gets the runtime base id for the given id. */
  
  
    function getRttBase(id) {
      const U32 = new Uint32Array(memory.buffer);
      if ((id >>>= 0) >= getRttiCount(U32)) throw Error(`invalid id: ${id}`);
      return U32[(__rtti_base + 4 >>> 2) + (id << 1) + 1];
    }
    /** Gets and validate runtime type info for the given id for array like objects */
  
  
    function getArrayInfo(id) {
      const info = getRttInfo(id);
      if (!(info & (ARRAYBUFFERVIEW | ARRAY | STATICARRAY))) throw Error(`not an array: ${id}, flags=${info}`);
      return info;
    }
    /** Gets the runtime alignment of a collection's values. */
  
  
    function getValueAlign(info) {
      return 31 - Math.clz32(info >>> VAL_ALIGN_OFFSET & 31); // -1 if none
    }
    /** Gets the runtime alignment of a collection's keys. */
    // function getKeyAlign(info) {
    //   return 31 - Math.clz32((info >>> KEY_ALIGN_OFFSET) & 31); // -1 if none
    // }
  
    /** Allocates a new string in the module's memory and returns its pointer. */
  
  
    function __newString(str) {
      if (str == null) return 0;
      const length = str.length;
  
      const ptr = __new(length << 1, STRING_ID);
  
      const U16 = new Uint16Array(memory.buffer);
  
      for (var i = 0, p = ptr >>> 1; i < length; ++i) U16[p + i] = str.charCodeAt(i);
  
      return ptr;
    }
  
    extendedExports.__newString = __newString;
    /** Allocates a new ArrayBuffer in the module's memory and returns its pointer. */
  
    function __newArrayBuffer(buf) {
      if (buf == null) return 0;
      const bufview = new Uint8Array(buf);
  
      const ptr = __new(bufview.length, ARRAYBUFFER_ID);
  
      const U8 = new Uint8Array(memory.buffer);
      U8.set(bufview, ptr);
      return ptr;
    }
  
    extendedExports.__newArrayBuffer = __newArrayBuffer;
    /** Reads a string from the module's memory by its pointer. */
  
    function __getString(ptr) {
      if (!ptr) return null;
      const buffer = memory.buffer;
      const id = new Uint32Array(buffer)[ptr + ID_OFFSET >>> 2];
      if (id !== STRING_ID) throw Error(`not a string: ${ptr}`);
      return getStringImpl(buffer, ptr);
    }
  
    extendedExports.__getString = __getString;
    /** Gets the view matching the specified alignment, signedness and floatness. */
  
    function getView(alignLog2, signed, float) {
      const buffer = memory.buffer;
  
      if (float) {
        switch (alignLog2) {
          case 2:
            return new Float32Array(buffer);
  
          case 3:
            return new Float64Array(buffer);
        }
      } else {
        switch (alignLog2) {
          case 0:
            return new (signed ? Int8Array : Uint8Array)(buffer);
  
          case 1:
            return new (signed ? Int16Array : Uint16Array)(buffer);
  
          case 2:
            return new (signed ? Int32Array : Uint32Array)(buffer);
  
          case 3:
            return new (signed ? BigInt64Array : BigUint64Array)(buffer);
        }
      }
  
      throw Error(`unsupported align: ${alignLog2}`);
    }
    /** Allocates a new array in the module's memory and returns its pointer. */
  
  
    function __newArray(id, valuesOrCapacity = 0) {
      const input = valuesOrCapacity;
      const info = getArrayInfo(id);
      const align = getValueAlign(info);
      const isArrayLike = typeof input !== "number";
      const length = isArrayLike ? input.length : input;
  
      const buf = __new(length << align, info & STATICARRAY ? id : ARRAYBUFFER_ID);
  
      let result;
  
      if (info & STATICARRAY) {
        result = buf;
      } else {
        __pin(buf);
  
        const arr = __new(info & ARRAY ? ARRAY_SIZE : ARRAYBUFFERVIEW_SIZE, id);
  
        __unpin(buf);
  
        const U32 = new Uint32Array(memory.buffer);
        U32[arr + ARRAYBUFFERVIEW_BUFFER_OFFSET >>> 2] = buf;
        U32[arr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2] = buf;
        U32[arr + ARRAYBUFFERVIEW_BYTELENGTH_OFFSET >>> 2] = length << align;
        if (info & ARRAY) U32[arr + ARRAY_LENGTH_OFFSET >>> 2] = length;
        result = arr;
      }
  
      if (isArrayLike) {
        const view = getView(align, info & VAL_SIGNED, info & VAL_FLOAT);
        const start = buf >>> align;
  
        if (info & VAL_MANAGED) {
          for (let i = 0; i < length; ++i) {
            view[start + i] = input[i];
          }
        } else {
          view.set(input, start);
        }
      }
  
      return result;
    }
  
    extendedExports.__newArray = __newArray;
    /** Gets a live view on an array's values in the module's memory. Infers the array type from RTTI. */
  
    function __getArrayView(arr) {
      const U32 = new Uint32Array(memory.buffer);
      const id = U32[arr + ID_OFFSET >>> 2];
      const info = getArrayInfo(id);
      const align = getValueAlign(info);
      let buf = info & STATICARRAY ? arr : U32[arr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2];
      const length = info & ARRAY ? U32[arr + ARRAY_LENGTH_OFFSET >>> 2] : U32[buf + SIZE_OFFSET >>> 2] >>> align;
      return getView(align, info & VAL_SIGNED, info & VAL_FLOAT).subarray(buf >>>= align, buf + length);
    }
  
    extendedExports.__getArrayView = __getArrayView;
    /** Copies an array's values from the module's memory. Infers the array type from RTTI. */
  
    function __getArray(arr) {
      const input = __getArrayView(arr);
  
      const len = input.length;
      const out = new Array(len);
  
      for (let i = 0; i < len; i++) out[i] = input[i];
  
      return out;
    }
  
    extendedExports.__getArray = __getArray;
    /** Copies an ArrayBuffer's value from the module's memory. */
  
    function __getArrayBuffer(ptr) {
      const buffer = memory.buffer;
      const length = new Uint32Array(buffer)[ptr + SIZE_OFFSET >>> 2];
      return buffer.slice(ptr, ptr + length);
    }
  
    extendedExports.__getArrayBuffer = __getArrayBuffer;
    /** Gets a function from poiner which contain table's index. */
  
    function __getFunction(ptr) {
      if (!table) throw Error(E_NO_EXPORT_TABLE);
      const index = new Uint32Array(memory.buffer)[ptr >>> 2];
      return table.get(index);
    }
  
    extendedExports.__getFunction = __getFunction;
    /** Copies a typed array's values from the module's memory. */
  
    function getTypedArray(Type, alignLog2, ptr) {
      return new Type(getTypedArrayView(Type, alignLog2, ptr));
    }
    /** Gets a live view on a typed array's values in the module's memory. */
  
  
    function getTypedArrayView(Type, alignLog2, ptr) {
      const buffer = memory.buffer;
      const U32 = new Uint32Array(buffer);
      return new Type(buffer, U32[ptr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2], U32[ptr + ARRAYBUFFERVIEW_BYTELENGTH_OFFSET >>> 2] >>> alignLog2);
    }
    /** Attach a set of get TypedArray and View functions to the exports. */
  
  
    function attachTypedArrayFunctions(ctor, name, align) {
      extendedExports[`__get${name}`] = getTypedArray.bind(null, ctor, align);
      extendedExports[`__get${name}View`] = getTypedArrayView.bind(null, ctor, align);
    }
  
    [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array].forEach(ctor => {
      attachTypedArrayFunctions(ctor, ctor.name, 31 - Math.clz32(ctor.BYTES_PER_ELEMENT));
    });
  
    if (BIGINT) {
      [BigUint64Array, BigInt64Array].forEach(ctor => {
        attachTypedArrayFunctions(ctor, ctor.name.slice(3), 3);
      });
    }
    /** Tests whether an object is an instance of the class represented by the specified base id. */
  
  
    function __instanceof(ptr, baseId) {
      const U32 = new Uint32Array(memory.buffer);
      let id = U32[ptr + ID_OFFSET >>> 2];
  
      if (id <= getRttiCount(U32)) {
        do {
          if (id == baseId) return true;
          id = getRttBase(id);
        } while (id);
      }
  
      return false;
    }
  
    extendedExports.__instanceof = __instanceof; // Pull basic exports to extendedExports so code in preInstantiate can use them
  
    extendedExports.memory = extendedExports.memory || memory;
    extendedExports.table = extendedExports.table || table; // Demangle exports and provide the usual utility on the prototype
  
    return demangle(exports, extendedExports);
  }
  
  function isResponse(src) {
    return typeof Response !== "undefined" && src instanceof Response;
  }
  
  function isModule(src) {
    return src instanceof WebAssembly.Module;
  }
  /** Asynchronously instantiates an AssemblyScript module from anything that can be instantiated. */
  
  
  async function instantiate(source, imports = {}) {
    if (isResponse(source = await source)) return instantiateStreaming(source, imports);
    const module = isModule(source) ? source : await WebAssembly.compile(source);
    const extended = preInstantiate(imports);
    const instance = await WebAssembly.instantiate(module, imports);
    const exports = postInstantiate(extended, instance);
    return {
      module,
      instance,
      exports
    };
  }
  /** Synchronously instantiates an AssemblyScript module from a WebAssembly.Module or binary buffer. */
  
  
  function instantiateSync(source, imports = {}) {
    const module = isModule(source) ? source : new WebAssembly.Module(source);
    const extended = preInstantiate(imports);
    const instance = new WebAssembly.Instance(module, imports);
    const exports = postInstantiate(extended, instance);
    return {
      module,
      instance,
      exports
    };
  }
  /** Asynchronously instantiates an AssemblyScript module from a response, i.e. as obtained by `fetch`. */
  
  
  async function instantiateStreaming(source, imports = {}) {
    if (!WebAssembly.instantiateStreaming) {
      return instantiate(isResponse(source = await source) ? source.arrayBuffer() : source, imports);
    }
  
    const extended = preInstantiate(imports);
    const result = await WebAssembly.instantiateStreaming(source, imports);
    const exports = postInstantiate(extended, result.instance);
    return { ...result,
      exports
    };
  }
  /** Demangles an AssemblyScript module's exports to a friendly object structure. */
  
  
  function demangle(exports, extendedExports = {}) {
    const setArgumentsLength = exports["__argumentsLength"] ? length => {
      exports["__argumentsLength"].value = length;
    } : exports["__setArgumentsLength"] || exports["__setargc"] || (() => {
      /* nop */
    });
  
    for (let internalName of Object.keys(exports)) {
      const elem = exports[internalName];
      let parts = internalName.split(".");
      let curr = extendedExports;
  
      while (parts.length > 1) {
        let part = parts.shift();
        if (!Object.hasOwn(curr, part)) curr[part] = {};
        curr = curr[part];
      }
  
      let name = parts[0];
      let hash = name.indexOf("#");
  
      if (hash >= 0) {
        const className = name.substring(0, hash);
        const classElem = curr[className];
  
        if (typeof classElem === "undefined" || !classElem.prototype) {
          const ctor = function (...args) {
            return ctor.wrap(ctor.prototype.constructor(0, ...args));
          };
  
          ctor.prototype = {
            valueOf() {
              return this[THIS];
            }
  
          };
  
          ctor.wrap = function (thisValue) {
            return Object.create(ctor.prototype, {
              [THIS]: {
                value: thisValue,
                writable: false
              }
            });
          };
  
          if (classElem) Object.getOwnPropertyNames(classElem).forEach(name => Object.defineProperty(ctor, name, Object.getOwnPropertyDescriptor(classElem, name)));
          curr[className] = ctor;
        }
  
        name = name.substring(hash + 1);
        curr = curr[className].prototype;
  
        if (/^(get|set):/.test(name)) {
          if (!Object.hasOwn(curr, name = name.substring(4))) {
            let getter = exports[internalName.replace("set:", "get:")];
            let setter = exports[internalName.replace("get:", "set:")];
            Object.defineProperty(curr, name, {
              get() {
                return getter(this[THIS]);
              },
  
              set(value) {
                setter(this[THIS], value);
              },
  
              enumerable: true
            });
          }
        } else {
          if (name === 'constructor') {
            (curr[name] = function (...args) {
              setArgumentsLength(args.length);
              return elem(...args);
            }).original = elem;
          } else {
            // instance method
            (curr[name] = function (...args) {
              // !
              setArgumentsLength(args.length);
              return elem(this[THIS], ...args);
            }).original = elem;
          }
        }
      } else {
        if (/^(get|set):/.test(name)) {
          if (!Object.hasOwn(curr, name = name.substring(4))) {
            Object.defineProperty(curr, name, {
              get: exports[internalName.replace("set:", "get:")],
              set: exports[internalName.replace("get:", "set:")],
              enumerable: true
            });
          }
        } else if (typeof elem === "function" && elem !== setArgumentsLength) {
          (curr[name] = (...args) => {
            setArgumentsLength(args.length);
            return elem(...args);
          }).original = elem;
        } else {
          curr[name] = elem;
        }
      }
    }
  
    return extendedExports;
  }
  
  var _default = {
    instantiate,
    instantiateSync,
    instantiateStreaming,
    demangle
  };
  exports.default = _default;
  return "default" in exports ? exports.default : exports;
})({});
if (typeof define === 'function' && define.amd) define([], function() { return loader; });
else if (typeof module === 'object' && typeof exports==='object') module.exports = loader;
