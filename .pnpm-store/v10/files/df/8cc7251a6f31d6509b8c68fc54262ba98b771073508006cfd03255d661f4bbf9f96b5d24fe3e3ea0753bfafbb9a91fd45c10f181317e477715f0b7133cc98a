import { jsSHABase, TWO_PWR_32, H_full, H_trunc, K_sha2, sha_variant_error, parseInputOption } from "./common";
import {
  packedValue,
  FixedLengthOptionsEncodingType,
  FixedLengthOptionsNoEncodingType,
  FormatNoTextType,
} from "./custom_types";
import { getStrConverter } from "./converters";
import {
  ch_32,
  gamma0_32,
  gamma1_32,
  maj_32,
  safeAdd_32_2,
  safeAdd_32_4,
  safeAdd_32_5,
  sigma0_32,
  sigma1_32,
} from "./primitives_32";

type VariantType = "SHA-224" | "SHA-256";

/**
 * Gets the state values for the specified SHA variant.
 *
 * @param variant: The SHA-256 family variant.
 * @returns The initial state values.
 */
function getNewState256(variant: VariantType): number[] {
  let retVal;

  if ("SHA-224" == variant) {
    retVal = H_trunc.slice();
  } else {
    /* "SHA-256" */
    retVal = H_full.slice();
  }
  return retVal;
}

/**
 * Performs a round of SHA-256 hashing over a block. This clobbers `H`.
 *
 * @param block The binary array representation of the block to hash.
 * @param H The intermediate H values from a previous round.
 * @returns The resulting H values.
 */
function roundSHA256(block: number[], H: number[]): number[] {
  let a, b, c, d, e, f, g, h, T1, T2, t;

  const W: number[] = [];

  a = H[0];
  b = H[1];
  c = H[2];
  d = H[3];
  e = H[4];
  f = H[5];
  g = H[6];
  h = H[7];

  for (t = 0; t < 64; t += 1) {
    if (t < 16) {
      W[t] = block[t];
    } else {
      W[t] = safeAdd_32_4(gamma1_32(W[t - 2]), W[t - 7], gamma0_32(W[t - 15]), W[t - 16]);
    }
    T1 = safeAdd_32_5(h, sigma1_32(e), ch_32(e, f, g), K_sha2[t], W[t]);
    T2 = safeAdd_32_2(sigma0_32(a), maj_32(a, b, c));
    h = g;
    g = f;
    f = e;
    e = safeAdd_32_2(d, T1);
    d = c;
    c = b;
    b = a;
    a = safeAdd_32_2(T1, T2);
  }

  H[0] = safeAdd_32_2(a, H[0]);
  H[1] = safeAdd_32_2(b, H[1]);
  H[2] = safeAdd_32_2(c, H[2]);
  H[3] = safeAdd_32_2(d, H[3]);
  H[4] = safeAdd_32_2(e, H[4]);
  H[5] = safeAdd_32_2(f, H[5]);
  H[6] = safeAdd_32_2(g, H[6]);
  H[7] = safeAdd_32_2(h, H[7]);

  return H;
}

/**
 * Finalizes the SHA-256 hash. This clobbers `remainder` and `H`.
 *
 * @param remainder Any leftover unprocessed packed ints that still need to be processed.
 * @param remainderBinLen The number of bits in `remainder`.
 * @param processedBinLen The number of bits already processed.
 * @param H The intermediate H values from a previous round.
 * @param variant The desired SHA-256 variant.
 * @returns The array of integers representing the SHA-2 hash of message.
 */
function finalizeSHA256(
  remainder: number[],
  remainderBinLen: number,
  processedBinLen: number,
  H: number[],
  variant: VariantType
): number[] {
  let i, retVal;

  /* The 65 addition is a hack but it works.  The correct number is
    actually 72 (64 + 8) but the below math fails if
    remainderBinLen + 72 % 512 = 0. Since remainderBinLen % 8 = 0,
    "shorting" the addition is OK. */
  const offset = (((remainderBinLen + 65) >>> 9) << 4) + 15,
    binaryStringInc = 16,
    totalLen = remainderBinLen + processedBinLen;

  while (remainder.length <= offset) {
    remainder.push(0);
  }
  /* Append '1' at the end of the binary string */
  remainder[remainderBinLen >>> 5] |= 0x80 << (24 - (remainderBinLen % 32));
  /* Append length of binary string in the position such that the new
   * length is correct. JavaScript numbers are limited to 2^53 so it's
   * "safe" to treat the totalLen as a 64-bit integer. */

  remainder[offset] = totalLen & 0xffffffff;
  /* Bitwise operators treat the operand as a 32-bit number so need to
   * use hacky division and round to get access to upper 32-ish bits */
  remainder[offset - 1] = (totalLen / TWO_PWR_32) | 0;

  /* This will always be at least 1 full chunk */
  for (i = 0; i < remainder.length; i += binaryStringInc) {
    H = roundSHA256(remainder.slice(i, i + binaryStringInc), H);
  }

  if ("SHA-224" === variant) {
    retVal = [H[0], H[1], H[2], H[3], H[4], H[5], H[6]];
  } else {
    /* "SHA-256 */
    retVal = H;
  }

  return retVal;
}
export default class jsSHA extends jsSHABase<number[], VariantType> {
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
  newStateFunc: (variant: VariantType) => number[];
  getMAC: () => number[];

  constructor(variant: VariantType, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
  constructor(variant: VariantType, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(variant: any, inputFormat: any, options?: any) {
    if (!("SHA-224" === variant || "SHA-256" === variant)) {
      throw new Error(sha_variant_error);
    }
    super(variant, inputFormat, options);
    const resolvedOptions = options || {};

    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.getMAC = this._getHMAC;
    this.HMACSupported = true;
    this.bigEndianMod = -1;
    this.converterFunc = getStrConverter(this.inputFormat, this.utfType, this.bigEndianMod);
    this.roundFunc = roundSHA256;
    this.stateCloneFunc = function (state): number[] {
      return state.slice();
    };

    this.newStateFunc = getNewState256;
    this.finalizeFunc = function (remainder, remainderBinLen, processedBinLen, H): number[] {
      return finalizeSHA256(remainder, remainderBinLen, processedBinLen, H, variant);
    };

    this.intermediateState = getNewState256(variant);
    this.variantBlockSize = 512;
    this.outputBinLen = "SHA-224" === variant ? 224 : 256;
    this.isVariableLen = false;

    if (resolvedOptions["hmacKey"]) {
      this._setHMACKey(parseInputOption("hmacKey", resolvedOptions["hmacKey"], this.bigEndianMod));
    }
  }
}
