/// <reference lib="esnext.bigint" />

export interface ResultObject {
  module: WebAssembly.Module;
  instance: WebAssembly.Instance;
}


/** WebAssembly imports with an optional env object and two levels of nesting. */
export type Imports = {
  [key: string]: Record<string,unknown> | undefined;
  env?: {
    memory?: WebAssembly.Memory;
    table?: WebAssembly.Table;
    seed?(): number;
    abort?(msg: number, file: number, line: number, column: number): void;
    trace?(msg: number, numArgs?: number, ...args: number[]): void;
    mark?(): void;
  };
};

/** Utility mixed in by the loader. */
export interface ASUtil {
  memory?: WebAssembly.Memory;
  table?: WebAssembly.Table;

  /** Explicit start function, if requested. */
  _start(): void;

  /** Copies a string's value from the module's memory. */
  __getString(ptr: number): string;
  /** Copies an ArrayBuffer's value from the module's memory. */
  __getArrayBuffer(ptr: number): ArrayBuffer;

  /** Copies an array's values from the module's memory. Infers the array type from RTTI. */
  __getArray(ptr: number): number[];
  /** Copies an Int8Array's values from the module's memory. */
  __getInt8Array(ptr: number): Int8Array;
  /** Copies an Uint8Array's values from the module's memory. */
  __getUint8Array(ptr: number): Uint8Array;
  /** Copies an Uint8ClampedArray's values from the module's memory. */
  __getUint8ClampedArray(ptr: number): Uint8ClampedArray;
  /** Copies an Int16Array's values from the module's memory. */
  __getInt16Array(ptr: number): Int16Array;
  /** Copies an Uint16Array's values from the module's memory. */
  __getUint16Array(ptr: number): Uint16Array;
  /** Copies an Int32Array's values from the module's memory. */
  __getInt32Array(ptr: number): Int32Array;
  /** Copies an Uint32Array's values from the module's memory. */
  __getUint32Array(ptr: number): Uint32Array;
  /** Copies an Int32Array's values from the module's memory. */
  __getInt64Array?(ptr: number): BigInt64Array;
  /** Copies an Uint32Array's values from the module's memory. */
  __getUint64Array?(ptr: number): BigUint64Array;
  /** Copies a Float32Array's values from the module's memory. */
  __getFloat32Array(ptr: number): Float32Array;
  /** Copies a Float64Array's values from the module's memory. */
  __getFloat64Array(ptr: number): Float64Array;

  /** Gets a live view on an array's values in the module's memory. Infers the array type from RTTI. */
  __getArrayView(ptr: number): ArrayBufferView;
  /** Gets a live view on an Int8Array's values in the module's memory. */
  __getInt8ArrayView(ptr: number): Int8Array;
  /** Gets a live view on an Uint8Array's values in the module's memory. */
  __getUint8ArrayView(ptr: number): Uint8Array;
  /** Gets a live view on an Uint8ClampedArray's values in the module's memory. */
  __getUint8ClampedArrayView(ptr: number): Uint8ClampedArray;
  /** Gets a live view on an Int16Array's values in the module's memory. */
  __getInt16ArrayView(ptr: number): Int16Array;
  /** Gets a live view on an Uint16Array's values in the module's memory. */
  __getUint16ArrayView(ptr: number): Uint16Array;
  /** Gets a live view on an Int32Array's values in the module's memory. */
  __getInt32ArrayView(ptr: number): Int32Array;
  /** Gets a live view on an Uint32Array's values in the module's memory. */
  __getUint32ArrayView(ptr: number): Uint32Array;
  /** Gets a live view on an Int32Array's values in the module's memory. */
  __getInt64ArrayView?(ptr: number): BigInt64Array;
  /** Gets a live view on an Uint32Array's values in the module's memory. */
  __getUint64ArrayView?(ptr: number): BigUint64Array;
  /** Gets a live view on a Float32Array's values in the module's memory. */
  __getFloat32ArrayView(ptr: number): Float32Array;
  /** Gets a live view on a Float64Array's values in the module's memory. */
  __getFloat64ArrayView(ptr: number): Float64Array;

  /** Gets a function from poiner which contain table's index. */
  __getFunction(ptr: number): ((...args: unknown[]) => unknown) | null;

  /** Tests whether a managed object is an instance of the class represented by the specified base id. */
  __instanceof(ptr: number, baseId: number): boolean;
  /** Allocates a new string in the module's memory and returns a reference (pointer) to it. */
  __newString(str: string): number;
  /** Allocates a new ArrayBuffer in the module's memory and returns a reference (pointer) to it. */
  __newArrayBuffer(buf: ArrayBuffer): number;
  /** Allocates a new array in the module's memory and returns a reference (pointer) to it. */
  __newArray(id: number, valuesOrCapacity?: Array<number> | ArrayBufferView | number): number;

  /** Allocates an instance of the class represented by the specified id. */
  __new(size: number, id: number): number;
  /** Pins a managed object externally, preventing it from becoming garbage collected. */
  __pin(ptr: number): number;
  /** Unpins a managed object externally, allowing it to become garbage collected. */
  __unpin(ptr: number): void;
  /** Performs a full garbage collection cycle. */
  __collect(incremental?: boolean): void;
}

/** Asynchronously instantiates an AssemblyScript module from anything that can be instantiated. */
export declare function instantiate<T extends Record<string,unknown>>(
  source: WebAssembly.Module | BufferSource | Response | PromiseLike<WebAssembly.Module | BufferSource | Response>,
  imports?: Imports
): Promise<ResultObject & { exports: ASUtil & T }>;

/** Synchronously instantiates an AssemblyScript module from a WebAssembly.Module or binary buffer. */
export declare function instantiateSync<T extends Record<string,unknown>>(
  source: WebAssembly.Module | BufferSource,
  imports?: Imports
): ResultObject & { exports: ASUtil & T };

/** Asynchronously instantiates an AssemblyScript module from a response, i.e. as obtained by `fetch`. */
export declare function instantiateStreaming<T extends Record<string,unknown>>(
  source: Response | PromiseLike<Response>,
  imports?: Imports
): Promise<ResultObject & { exports: ASUtil & T }>;

/** Demangles an AssemblyScript module's exports to a friendly object structure. */
export declare function demangle<T extends Record<string,unknown>>(
  exports: Record<string,unknown>,
  extendedExports?: Record<string,unknown>
): T;
