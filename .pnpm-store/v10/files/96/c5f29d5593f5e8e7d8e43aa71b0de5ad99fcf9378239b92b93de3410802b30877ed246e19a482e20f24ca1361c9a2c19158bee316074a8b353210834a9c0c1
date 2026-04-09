/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} buf
* @returns {Uint8Array}
*/
export function decompress(buf: Uint8Array): Uint8Array;
/**
* Same as [`brotli::BrotliResult`] except [`brotli::BrotliResult::ResultFailure`].
*
* Always `> 0`.
*
* `ResultFailure` is removed
* because we will convert the failure to an actual negative error code (if available) and pass it elsewhere.
*/
export enum BrotliStreamResultCode {
  ResultSuccess,
  NeedsMoreInput,
  NeedsMoreOutput,
}


type Options = {
    quality?: number
};

export function compress(buf: Uint8Array, options?: Options): Uint8Array;


/**
* Returned by every successful (de)compression.
*/
export class BrotliStreamResult {
  free(): void;
/**
* Output buffer
*/
  buf: Uint8Array;
/**
* Result code.
*
* See [`BrotliStreamResultCode`] for available values.
*
* When error, the error code is not passed here but rather goes to `Err`.
*/
  code: number;
/**
* Consumed bytes of the input buffer
*/
  input_offset: number;
}
/**
*/
export class CompressStream {
  free(): void;
/**
* @param {number | undefined} quality
*/
  constructor(quality?: number);
/**
* @param {Uint8Array | undefined} input_opt
* @param {number} output_size
* @returns {BrotliStreamResult}
*/
  compress(input_opt: Uint8Array | undefined, output_size: number): BrotliStreamResult;
/**
* @returns {number}
*/
  total_out(): number;
}
/**
*/
export class DecompressStream {
  free(): void;
/**
*/
  constructor();
/**
* @param {Uint8Array} input
* @param {number} output_size
* @returns {BrotliStreamResult}
*/
  decompress(input: Uint8Array, output_size: number): BrotliStreamResult;
/**
* @returns {number}
*/
  total_out(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly compress: (a: number, b: number, c: number, d: number) => void;
  readonly decompress: (a: number, b: number, c: number) => void;
  readonly __wbg_brotlistreamresult_free: (a: number) => void;
  readonly __wbg_get_brotlistreamresult_code: (a: number) => number;
  readonly __wbg_set_brotlistreamresult_code: (a: number, b: number) => void;
  readonly __wbg_get_brotlistreamresult_buf: (a: number, b: number) => void;
  readonly __wbg_set_brotlistreamresult_buf: (a: number, b: number, c: number) => void;
  readonly __wbg_get_brotlistreamresult_input_offset: (a: number) => number;
  readonly __wbg_set_brotlistreamresult_input_offset: (a: number, b: number) => void;
  readonly __wbg_compressstream_free: (a: number) => void;
  readonly compressstream_new: (a: number, b: number) => number;
  readonly compressstream_compress: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly compressstream_total_out: (a: number) => number;
  readonly __wbg_decompressstream_free: (a: number) => void;
  readonly decompressstream_new: () => number;
  readonly decompressstream_decompress: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly decompressstream_total_out: (a: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
