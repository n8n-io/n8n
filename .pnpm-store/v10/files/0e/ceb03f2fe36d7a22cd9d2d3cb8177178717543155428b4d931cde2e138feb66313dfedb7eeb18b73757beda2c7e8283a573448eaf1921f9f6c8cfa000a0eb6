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
