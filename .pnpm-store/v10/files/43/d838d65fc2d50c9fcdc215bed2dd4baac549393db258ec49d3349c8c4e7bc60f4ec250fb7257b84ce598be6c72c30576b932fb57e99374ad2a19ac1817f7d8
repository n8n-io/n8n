import { jsSHABase, TWO_PWR_32, sha_variant_error, parseInputOption } from "./common";
import {
  packedValue,
  FixedLengthOptionsEncodingType,
  FixedLengthOptionsNoEncodingType,
  FormatNoTextType,
} from "./custom_types";
import { getStrConverter } from "./converters";
import { ch_32, parity_32, maj_32, rotl_32, safeAdd_32_2, safeAdd_32_5 } from "./primitives_32";

/**
 * Gets the state values for the specified SHA variant.
 *
 * @param _variant: Unused
 * @returns The initial state values.
 */
function getNewState(_variant: "SHA-1"): number[] {
  return [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
}

/**
 * Performs a round of SHA-1 hashing over a 512-byte block.  This clobbers `H`.
 *
 * @param block The binary array representation of the block to hash.
 * @param H The intermediate H values from a previous round.
 * @returns The resulting H values.
 */
function roundSHA1(block: number[], H: number[]): number[] {
  let a, b, c, d, e, T, t;
  const W: number[] = [];

  a = H[0];
  b = H[1];
  c = H[2];
  d = H[3];
  e = H[4];

  for (t = 0; t < 80; t += 1) {
    if (t < 16) {
      W[t] = block[t];
    } else {
      W[t] = rotl_32(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }

    if (t < 20) {
      T = safeAdd_32_5(rotl_32(a, 5), ch_32(b, c, d), e, 0x5a827999, W[t]);
    } else if (t < 40) {
      T = safeAdd_32_5(rotl_32(a, 5), parity_32(b, c, d), e, 0x6ed9eba1, W[t]);
    } else if (t < 60) {
      T = safeAdd_32_5(rotl_32(a, 5), maj_32(b, c, d), e, 0x8f1bbcdc, W[t]);
    } else {
      T = safeAdd_32_5(rotl_32(a, 5), parity_32(b, c, d), e, 0xca62c1d6, W[t]);
    }

    e = d;
    d = c;
    c = rotl_32(b, 30);
    b = a;
    a = T;
  }

  H[0] = safeAdd_32_2(a, H[0]);
  H[1] = safeAdd_32_2(b, H[1]);
  H[2] = safeAdd_32_2(c, H[2]);
  H[3] = safeAdd_32_2(d, H[3]);
  H[4] = safeAdd_32_2(e, H[4]);

  return H;
}

/**
 * Finalizes the SHA-1 hash.  This clobbers `remainder` and `H`.
 *
 * @param remainder Any leftover unprocessed packed ints that still need to be processed.
 * @param remainderBinLen The number of bits in `remainder`.
 * @param processedBinLen The number of bits already processed.
 * @param H The intermediate H values from a previous round.
 * @returns The array of integers representing the SHA-1 hash of message.
 */
function finalizeSHA1(remainder: number[], remainderBinLen: number, processedBinLen: number, H: number[]): number[] {
  let i;

  /* The 65 addition is a hack but it works.  The correct number is
		actually 72 (64 + 8) but the below math fails if
		remainderBinLen + 72 % 512 = 0. Since remainderBinLen % 8 = 0,
		"shorting" the addition is OK. */
  const offset = (((remainderBinLen + 65) >>> 9) << 4) + 15,
    totalLen = remainderBinLen + processedBinLen;
  while (remainder.length <= offset) {
    remainder.push(0);
  }
  /* Append '1' at the end of the binary string */
  remainder[remainderBinLen >>> 5] |= 0x80 << (24 - (remainderBinLen % 32));

  /* Append length of binary string in the position such that the new
   * length is a multiple of 512.  Logic does not work for even multiples
   * of 512 but there can never be even multiples of 512. JavaScript
   * numbers are limited to 2^53 so it's "safe" to treat the totalLen as
   * a 64-bit integer. */
  remainder[offset] = totalLen & 0xffffffff;

  /* Bitwise operators treat the operand as a 32-bit number so need to
   * use hacky division and round to get access to upper 32-ish bits */
  remainder[offset - 1] = (totalLen / TWO_PWR_32) | 0;

  /* This will always be at least 1 full chunk */
  for (i = 0; i < remainder.length; i += 16) {
    H = roundSHA1(remainder.slice(i, i + 16), H);
  }

  return H;
}

export default class jsSHA extends jsSHABase<number[], "SHA-1"> {
  intermediateState: number[];
  variantBlockSize: number;
  bigEndianMod: -1 | 1;
  outputBinLen: number;
  isVariableLen: boolean;
  HMACSupported: boolean;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
  roundFunc: (block: number[], H: number[]) => number[];
  finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: number[]) => number[];
  stateCloneFunc: (state: number[]) => number[];
  newStateFunc: (variant: "SHA-1") => number[];
  getMAC: () => number[];

  constructor(variant: "SHA-1", inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
  constructor(variant: "SHA-1", inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(variant: any, inputFormat: any, options?: any) {
    if ("SHA-1" !== variant) {
      throw new Error(sha_variant_error);
    }
    super(variant, inputFormat, options);
    const resolvedOptions = options || {};

    this.HMACSupported = true;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.getMAC = this._getHMAC;
    this.bigEndianMod = -1;
    this.converterFunc = getStrConverter(this.inputFormat, this.utfType, this.bigEndianMod);
    this.roundFunc = roundSHA1;
    this.stateCloneFunc = function (state: number[]): number[] {
      return state.slice();
    };
    this.newStateFunc = getNewState;
    this.finalizeFunc = finalizeSHA1;

    this.intermediateState = getNewState(variant);
    this.variantBlockSize = 512;
    this.outputBinLen = 160;
    this.isVariableLen = false;

    if (resolvedOptions["hmacKey"]) {
      this._setHMACKey(parseInputOption("hmacKey", resolvedOptions["hmacKey"], this.bigEndianMod));
    }
  }
}
