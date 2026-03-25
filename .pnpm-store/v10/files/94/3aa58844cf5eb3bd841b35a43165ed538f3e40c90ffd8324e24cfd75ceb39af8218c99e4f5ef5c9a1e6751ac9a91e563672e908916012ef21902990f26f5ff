import { jsSHABase, TWO_PWR_32, H_trunc, H_full, K_sha2, sha_variant_error, parseInputOption } from "./common";
import {
  packedValue,
  FixedLengthOptionsEncodingType,
  FixedLengthOptionsNoEncodingType,
  FormatNoTextType,
} from "./custom_types";
import { getStrConverter } from "./converters";
import {
  ch_64,
  gamma0_64,
  gamma1_64,
  Int_64,
  maj_64,
  safeAdd_64_2,
  safeAdd_64_4,
  safeAdd_64_5,
  sigma0_64,
  sigma1_64,
} from "./primitives_64";

type VariantType = "SHA-384" | "SHA-512";

const K_sha512 = [
  new Int_64(K_sha2[0], 0xd728ae22),
  new Int_64(K_sha2[1], 0x23ef65cd),
  new Int_64(K_sha2[2], 0xec4d3b2f),
  new Int_64(K_sha2[3], 0x8189dbbc),
  new Int_64(K_sha2[4], 0xf348b538),
  new Int_64(K_sha2[5], 0xb605d019),
  new Int_64(K_sha2[6], 0xaf194f9b),
  new Int_64(K_sha2[7], 0xda6d8118),
  new Int_64(K_sha2[8], 0xa3030242),
  new Int_64(K_sha2[9], 0x45706fbe),
  new Int_64(K_sha2[10], 0x4ee4b28c),
  new Int_64(K_sha2[11], 0xd5ffb4e2),
  new Int_64(K_sha2[12], 0xf27b896f),
  new Int_64(K_sha2[13], 0x3b1696b1),
  new Int_64(K_sha2[14], 0x25c71235),
  new Int_64(K_sha2[15], 0xcf692694),
  new Int_64(K_sha2[16], 0x9ef14ad2),
  new Int_64(K_sha2[17], 0x384f25e3),
  new Int_64(K_sha2[18], 0x8b8cd5b5),
  new Int_64(K_sha2[19], 0x77ac9c65),
  new Int_64(K_sha2[20], 0x592b0275),
  new Int_64(K_sha2[21], 0x6ea6e483),
  new Int_64(K_sha2[22], 0xbd41fbd4),
  new Int_64(K_sha2[23], 0x831153b5),
  new Int_64(K_sha2[24], 0xee66dfab),
  new Int_64(K_sha2[25], 0x2db43210),
  new Int_64(K_sha2[26], 0x98fb213f),
  new Int_64(K_sha2[27], 0xbeef0ee4),
  new Int_64(K_sha2[28], 0x3da88fc2),
  new Int_64(K_sha2[29], 0x930aa725),
  new Int_64(K_sha2[30], 0xe003826f),
  new Int_64(K_sha2[31], 0x0a0e6e70),
  new Int_64(K_sha2[32], 0x46d22ffc),
  new Int_64(K_sha2[33], 0x5c26c926),
  new Int_64(K_sha2[34], 0x5ac42aed),
  new Int_64(K_sha2[35], 0x9d95b3df),
  new Int_64(K_sha2[36], 0x8baf63de),
  new Int_64(K_sha2[37], 0x3c77b2a8),
  new Int_64(K_sha2[38], 0x47edaee6),
  new Int_64(K_sha2[39], 0x1482353b),
  new Int_64(K_sha2[40], 0x4cf10364),
  new Int_64(K_sha2[41], 0xbc423001),
  new Int_64(K_sha2[42], 0xd0f89791),
  new Int_64(K_sha2[43], 0x0654be30),
  new Int_64(K_sha2[44], 0xd6ef5218),
  new Int_64(K_sha2[45], 0x5565a910),
  new Int_64(K_sha2[46], 0x5771202a),
  new Int_64(K_sha2[47], 0x32bbd1b8),
  new Int_64(K_sha2[48], 0xb8d2d0c8),
  new Int_64(K_sha2[49], 0x5141ab53),
  new Int_64(K_sha2[50], 0xdf8eeb99),
  new Int_64(K_sha2[51], 0xe19b48a8),
  new Int_64(K_sha2[52], 0xc5c95a63),
  new Int_64(K_sha2[53], 0xe3418acb),
  new Int_64(K_sha2[54], 0x7763e373),
  new Int_64(K_sha2[55], 0xd6b2b8a3),
  new Int_64(K_sha2[56], 0x5defb2fc),
  new Int_64(K_sha2[57], 0x43172f60),
  new Int_64(K_sha2[58], 0xa1f0ab72),
  new Int_64(K_sha2[59], 0x1a6439ec),
  new Int_64(K_sha2[60], 0x23631e28),
  new Int_64(K_sha2[61], 0xde82bde9),
  new Int_64(K_sha2[62], 0xb2c67915),
  new Int_64(K_sha2[63], 0xe372532b),
  new Int_64(0xca273ece, 0xea26619c),
  new Int_64(0xd186b8c7, 0x21c0c207),
  new Int_64(0xeada7dd6, 0xcde0eb1e),
  new Int_64(0xf57d4f7f, 0xee6ed178),
  new Int_64(0x06f067aa, 0x72176fba),
  new Int_64(0x0a637dc5, 0xa2c898a6),
  new Int_64(0x113f9804, 0xbef90dae),
  new Int_64(0x1b710b35, 0x131c471b),
  new Int_64(0x28db77f5, 0x23047d84),
  new Int_64(0x32caab7b, 0x40c72493),
  new Int_64(0x3c9ebe0a, 0x15c9bebc),
  new Int_64(0x431d67c4, 0x9c100d4c),
  new Int_64(0x4cc5d4be, 0xcb3e42b6),
  new Int_64(0x597f299c, 0xfc657e2a),
  new Int_64(0x5fcb6fab, 0x3ad6faec),
  new Int_64(0x6c44198c, 0x4a475817),
];

/**
 * Gets the state values for the specified SHA variant.
 *
 * @param variant: The SHA-512 family variant.
 * @returns The initial state values.
 */
function getNewState512(variant: VariantType): Int_64[] {
  if ("SHA-384" === variant) {
    return [
      new Int_64(0xcbbb9d5d, H_trunc[0]),
      new Int_64(0x0629a292a, H_trunc[1]),
      new Int_64(0x9159015a, H_trunc[2]),
      new Int_64(0x0152fecd8, H_trunc[3]),
      new Int_64(0x67332667, H_trunc[4]),
      new Int_64(0x98eb44a87, H_trunc[5]),
      new Int_64(0xdb0c2e0d, H_trunc[6]),
      new Int_64(0x047b5481d, H_trunc[7]),
    ];
  } else {
    /* SHA-512 */
    return [
      new Int_64(H_full[0], 0xf3bcc908),
      new Int_64(H_full[1], 0x84caa73b),
      new Int_64(H_full[2], 0xfe94f82b),
      new Int_64(H_full[3], 0x5f1d36f1),
      new Int_64(H_full[4], 0xade682d1),
      new Int_64(H_full[5], 0x2b3e6c1f),
      new Int_64(H_full[6], 0xfb41bd6b),
      new Int_64(H_full[7], 0x137e2179),
    ];
  }
}

/**
 * Performs a round of SHA-512 hashing over a block. This clobbers `H`.
 *
 * @param block The binary array representation of the block to hash.
 * @param H The intermediate H values from a previous round.
 * @returns The resulting H values.
 */
function roundSHA512(block: number[], H: Int_64[]): Int_64[] {
  let a, b, c, d, e, f, g, h, T1, T2, t, offset;

  const W: Int_64[] = [];

  a = H[0];
  b = H[1];
  c = H[2];
  d = H[3];
  e = H[4];
  f = H[5];
  g = H[6];
  h = H[7];

  for (t = 0; t < 80; t += 1) {
    if (t < 16) {
      offset = t * 2;
      W[t] = new Int_64(block[offset], block[offset + 1]);
    } else {
      W[t] = safeAdd_64_4(gamma1_64(W[t - 2]), W[t - 7], gamma0_64(W[t - 15]), W[t - 16]);
    }
    T1 = safeAdd_64_5(h, sigma1_64(e), ch_64(e, f, g), K_sha512[t], W[t]);
    T2 = safeAdd_64_2(sigma0_64(a), maj_64(a, b, c));
    h = g;
    g = f;
    f = e;
    e = safeAdd_64_2(d, T1);
    d = c;
    c = b;
    b = a;
    a = safeAdd_64_2(T1, T2);
  }

  H[0] = safeAdd_64_2(a, H[0]);
  H[1] = safeAdd_64_2(b, H[1]);
  H[2] = safeAdd_64_2(c, H[2]);
  H[3] = safeAdd_64_2(d, H[3]);
  H[4] = safeAdd_64_2(e, H[4]);
  H[5] = safeAdd_64_2(f, H[5]);
  H[6] = safeAdd_64_2(g, H[6]);
  H[7] = safeAdd_64_2(h, H[7]);

  return H;
}

/**
 * Finalizes the SHA-512 hash. This clobbers `remainder` and `H`.
 *
 * @param remainder Any leftover unprocessed packed ints that still need to be processed.
 * @param remainderBinLen The number of bits in `remainder`.
 * @param processedBinLen The number of bits already processed.
 * @param H The intermediate H values from a previous round.
 * @param variant The desired SHA-512 variant.
 * @returns The array of integers representing the SHA-512 hash of message.
 */
function finalizeSHA512(
  remainder: number[],
  remainderBinLen: number,
  processedBinLen: number,
  H: Int_64[],
  variant: VariantType
): number[] {
  let i, retVal;

  /* The 129 addition is a hack but it works.  The correct number is
    actually 136 (128 + 8) but the below math fails if
    remainderBinLen + 136 % 1024 = 0. Since remainderBinLen % 8 = 0,
    "shorting" the addition is OK. */
  const offset = (((remainderBinLen + 129) >>> 10) << 5) + 31,
    binaryStringInc = 32,
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
    H = roundSHA512(remainder.slice(i, i + binaryStringInc), H);
  }

  if ("SHA-384" === variant) {
    H = (H as unknown) as Int_64[];
    retVal = [
      H[0].highOrder,
      H[0].lowOrder,
      H[1].highOrder,
      H[1].lowOrder,
      H[2].highOrder,
      H[2].lowOrder,
      H[3].highOrder,
      H[3].lowOrder,
      H[4].highOrder,
      H[4].lowOrder,
      H[5].highOrder,
      H[5].lowOrder,
    ];
  } else {
    /* SHA-512 */
    retVal = [
      H[0].highOrder,
      H[0].lowOrder,
      H[1].highOrder,
      H[1].lowOrder,
      H[2].highOrder,
      H[2].lowOrder,
      H[3].highOrder,
      H[3].lowOrder,
      H[4].highOrder,
      H[4].lowOrder,
      H[5].highOrder,
      H[5].lowOrder,
      H[6].highOrder,
      H[6].lowOrder,
      H[7].highOrder,
      H[7].lowOrder,
    ];
  }
  return retVal;
}

export default class jsSHA extends jsSHABase<Int_64[], VariantType> {
  intermediateState: Int_64[];
  variantBlockSize: number;
  bigEndianMod: -1 | 1;
  outputBinLen: number;
  isVariableLen: boolean;
  HMACSupported: boolean;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
  roundFunc: (block: number[], H: Int_64[]) => Int_64[];
  finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: Int_64[]) => number[];
  stateCloneFunc: (state: Int_64[]) => Int_64[];
  newStateFunc: (variant: VariantType) => Int_64[];
  getMAC: () => number[];

  constructor(variant: VariantType, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
  constructor(variant: VariantType, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(variant: any, inputFormat: any, options?: any) {
    if (!("SHA-384" === variant || "SHA-512" === variant)) {
      throw new Error(sha_variant_error);
    }
    super(variant, inputFormat, options);
    const resolvedOptions = options || {};

    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.getMAC = this._getHMAC;
    this.HMACSupported = true;
    this.bigEndianMod = -1;
    this.converterFunc = getStrConverter(this.inputFormat, this.utfType, this.bigEndianMod);
    this.roundFunc = roundSHA512;
    this.stateCloneFunc = function (state): Int_64[] {
      return state.slice();
    };
    this.newStateFunc = getNewState512;
    this.finalizeFunc = function (remainder, remainderBinLen, processedBinLen, H): number[] {
      return finalizeSHA512(remainder, remainderBinLen, processedBinLen, H, variant);
    };

    this.intermediateState = getNewState512(variant);
    this.variantBlockSize = 1024;
    this.outputBinLen = "SHA-384" === variant ? 384 : 512;
    this.isVariableLen = false;

    if (resolvedOptions["hmacKey"]) {
      this._setHMACKey(parseInputOption("hmacKey", resolvedOptions["hmacKey"], this.bigEndianMod));
    }
  }
}
