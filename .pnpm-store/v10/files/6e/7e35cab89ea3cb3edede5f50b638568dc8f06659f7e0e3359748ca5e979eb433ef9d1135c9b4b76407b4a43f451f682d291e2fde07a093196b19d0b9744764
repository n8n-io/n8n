/// <reference types="node" />

/**
 * These definitions were written by BendingBender (https://github.com/BendingBender)
 */

export = crc32;

declare function crc32(input: string | Buffer, partialCrc?: Buffer | number): Buffer;

declare namespace crc32 {
  /**
   * Convenience method that returns a signed int instead of a `Buffer`.
   *
   * @example
   * import crc32 = require('buffer-crc32');
   *
   * // works with buffers
   * const buf = Buffer.from([0x00, 0x73, 0x75, 0x70, 0x20, 0x62, 0x72, 0x6f, 0x00]);
   * crc32.signed(buf); // -> -1805997238
   */
  function signed(buffer: string | Buffer, partialCrc?: Buffer | number): number;

  /**
   * Convenience method that returns an unsigned int instead of a `Buffer`.
   *
   * @example
   * import crc32 = require('buffer-crc32');
   *
   * // works with buffers
   * const buf = Buffer.from([0x00, 0x73, 0x75, 0x70, 0x20, 0x62, 0x72, 0x6f, 0x00]);
   * crc32.unsigned(buf); // -> 2488970058
   */
  function unsigned(buffer: string | Buffer, partialCrc?: Buffer | number): number;
}
