import { sha_variant_error } from "./common";
import {
  CSHAKEOptionsEncodingType,
  CSHAKEOptionsNoEncodingType,
  SHAKEOptionsEncodingType,
  SHAKEOptionsNoEncodingType,
  EncodingType,
  FixedLengthOptionsEncodingType,
  FixedLengthOptionsNoEncodingType,
  FormatNoTextType,
  KMACOptionsNoEncodingType,
  KMACOptionsEncodingType,
} from "./custom_types";
import jsSHA1 from "./sha1";
import jsSHA256 from "./sha256";
import jsSHA512 from "./sha512";
import jsSHA3 from "./sha3";

type FixedLengthVariantType =
  | "SHA-1"
  | "SHA-224"
  | "SHA-256"
  | "SHA-384"
  | "SHA-512"
  | "SHA3-224"
  | "SHA3-256"
  | "SHA3-384"
  | "SHA3-512";

export default class jsSHA {
  private readonly shaObj: jsSHA1 | jsSHA256 | jsSHA512 | jsSHA3;
  /**
   * @param variant The desired SHA variant (SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-224, SHA3-256, SHA3-256,
   *   SHA3-384, SHA3-512, SHAKE128, SHAKE256, CSHAKE128, CSHAKE256, KMAC128, or KMAC256) as a string.
   * @param inputFormat The input format to be used in future `update` calls (TEXT, HEX, B64, BYTES, ARRAYBUFFER,
   *   or UINT8ARRAY) as a string.
   * @param options Options in the form of { encoding?: "UTF8" | "UTF16BE" | "UTF16LE"; numRounds?: number }.
   *   `encoding` is for only TEXT input (defaults to UTF8) and `numRounds` defaults to 1.
   *   `numRounds` is not valid for any of the MAC or CSHAKE variants.
   *   * If the variant supports HMAC, `options` may have an additional `hmacKey` key which must be in the form of
   *     {value: <INPUT>, format: <FORMAT>, encoding?: "UTF8" | "UTF16BE" | "UTF16LE"} where <FORMAT> takes the same
   *     values as `inputFormat` and <INPUT> can be a `string | ArrayBuffer | Uint8Array` depending on <FORMAT>.
   *     Supplying this key switches to HMAC calculation and replaces the now deprecated call to `setHMACKey`.
   *   * If the variant is CSHAKE128 or CSHAKE256, `options` may have two additional keys, `customization` and `funcName`,
   *     which are the NIST customization and function-name strings.  Both must be in the same form as `hmacKey`.
   *   * If the variant is KMAC128 or KMAC256, `options` can include the `customization` key from CSHAKE variants and
   *     *must* have a `kmacKey` key that takes the same form as the `customization` key.
   */
  constructor(variant: FixedLengthVariantType, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
  constructor(
    variant: FixedLengthVariantType,
    inputFormat: FormatNoTextType,
    options?: FixedLengthOptionsNoEncodingType
  );
  constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: "TEXT", options?: SHAKEOptionsEncodingType);
  constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: FormatNoTextType, options?: SHAKEOptionsNoEncodingType);
  constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: "TEXT", options?: CSHAKEOptionsEncodingType);
  constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: FormatNoTextType, options?: CSHAKEOptionsNoEncodingType);
  constructor(variant: "KMAC128" | "KMAC256", inputFormat: "TEXT", options: KMACOptionsEncodingType);
  constructor(variant: "KMAC128" | "KMAC256", inputFormat: FormatNoTextType, options: KMACOptionsNoEncodingType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(variant: any, inputFormat: any, options?: any) {
    if ("SHA-1" == variant) {
      this.shaObj = new jsSHA1(variant, inputFormat, options);
    } else if ("SHA-224" == variant || "SHA-256" == variant) {
      this.shaObj = new jsSHA256(variant, inputFormat, options);
    } else if ("SHA-384" == variant || "SHA-512" == variant) {
      this.shaObj = new jsSHA512(variant, inputFormat, options);
    } else if (
      "SHA3-224" == variant ||
      "SHA3-256" == variant ||
      "SHA3-384" == variant ||
      "SHA3-512" == variant ||
      "SHAKE128" == variant ||
      "SHAKE256" == variant ||
      "CSHAKE128" == variant ||
      "CSHAKE256" == variant ||
      "KMAC128" == variant ||
      "KMAC256" == variant
    ) {
      this.shaObj = new jsSHA3(variant, inputFormat, options);
    } else {
      throw new Error(sha_variant_error);
    }
  }

  /**
   * Takes `input` and hashes as many blocks as possible. Stores the rest for either a future `update` or `getHash` call.
   *
   * @param input The input to be hashed.
   * @returns A reference to the object.
   */
  update(input: string | ArrayBuffer | Uint8Array): this {
    this.shaObj.update(input);

    return this;
  }

  /**
   * Returns the desired SHA or MAC (if a HMAC/KMAC key was specified) hash of the input fed in via `update` calls.
   *
   * @param format The desired output formatting (B64, HEX, BYTES, ARRAYBUFFER, or UINT8ARRAY) as a string.
   * @param options Options in the form of { outputUpper?: boolean; b64Pad?: string; outputLen?: number;  }.
   *   `outputLen` is required for variable length output variants (this option was previously called `shakeLen` which
   *    is now deprecated).
   *   `outputUpper` is only for HEX output (defaults to false) and b64pad is only for B64 output (defaults to "=").
   * @returns The hash in the format specified.
   */
  getHash(format: "HEX", options?: { outputUpper?: boolean; outputLen?: number; shakeLen?: number }): string;
  getHash(format: "B64", options?: { b64Pad?: string; outputLen?: number; shakeLen?: number }): string;
  getHash(format: "BYTES", options?: { outputLen?: number; shakeLen?: number }): string;
  getHash(format: "UINT8ARRAY", options?: { outputLen?: number; shakeLen?: number }): Uint8Array;
  getHash(format: "ARRAYBUFFER", options?: { outputLen?: number; shakeLen?: number }): ArrayBuffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHash(format: any, options?: any): any {
    return this.shaObj.getHash(format, options);
  }

  /**
   * Sets the HMAC key for an eventual `getHMAC` call.  Must be called immediately after jsSHA object instantiation.
   * Now deprecated in favor of setting the `hmacKey` at object instantiation.
   *
   * @param key The key used to calculate the HMAC
   * @param inputFormat The format of key (HEX, TEXT, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY) as a string.
   * @param options Options in the form of { encoding?: "UTF8" | "UTF16BE" | "UTF16LE }.  `encoding` is only for TEXT
   *   and defaults to UTF8.
   */
  setHMACKey(key: string, inputFormat: "TEXT", options?: { encoding?: EncodingType }): void;
  setHMACKey(key: string, inputFormat: "B64" | "HEX" | "BYTES"): void;
  setHMACKey(key: ArrayBuffer, inputFormat: "ARRAYBUFFER"): void;
  setHMACKey(key: Uint8Array, inputFormat: "UINT8ARRAY"): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setHMACKey(key: any, inputFormat: any, options?: any): void {
    this.shaObj.setHMACKey(key, inputFormat, options);
  }

  /**
   * Returns the the HMAC in the specified format using the key given by a previous `setHMACKey` call. Now deprecated
   * in favor of just calling `getHash`.
   *
   * @param format The desired output formatting (B64, HEX, BYTES, ARRAYBUFFER, or UINT8ARRAY) as a string.
   * @param options Options in the form of { outputUpper?: boolean; b64Pad?: string }. `outputUpper` is only for HEX
   *   output (defaults to false) and `b64pad` is only for B64 output (defaults to "=").
   * @returns The HMAC in the format specified.
   */
  getHMAC(format: "HEX", options?: { outputUpper?: boolean }): string;
  getHMAC(format: "B64", options?: { b64Pad?: string }): string;
  getHMAC(format: "BYTES"): string;
  getHMAC(format: "UINT8ARRAY"): Uint8Array;
  getHMAC(format: "ARRAYBUFFER"): ArrayBuffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHMAC(format: any, options?: any): any {
    return this.shaObj.getHMAC(format, options);
  }
}
