import { jsSHABase, packedLEConcat, sha_variant_error, mac_rounds_error, TWO_PWR_32, parseInputOption } from "./common";
import {
  packedValue,
  CSHAKEOptionsNoEncodingType,
  CSHAKEOptionsEncodingType,
  SHAKEOptionsNoEncodingType,
  SHAKEOptionsEncodingType,
  KMACOptionsNoEncodingType,
  KMACOptionsEncodingType,
  FixedLengthOptionsEncodingType,
  FixedLengthOptionsNoEncodingType,
  FormatNoTextType,
  ResolvedCSHAKEOptionsNoEncodingType,
  ResolvedKMACOptionsNoEncodingType,
} from "./custom_types";
import { getStrConverter } from "./converters";
import { Int_64, rotl_64, xor_64_2, xor_64_5 } from "./primitives_64";

type FixedLengthVariantType = "SHA3-224" | "SHA3-256" | "SHA3-384" | "SHA3-512" | "SHAKE128" | "SHAKE256";

type VariantType = FixedLengthVariantType | "SHAKE128" | "SHAKE256" | "CSHAKE128" | "CSHAKE256" | "KMAC128" | "KMAC256";

const rc_sha3 = [
  new Int_64(0x00000000, 0x00000001),
  new Int_64(0x00000000, 0x00008082),
  new Int_64(0x80000000, 0x0000808a),
  new Int_64(0x80000000, 0x80008000),
  new Int_64(0x00000000, 0x0000808b),
  new Int_64(0x00000000, 0x80000001),
  new Int_64(0x80000000, 0x80008081),
  new Int_64(0x80000000, 0x00008009),
  new Int_64(0x00000000, 0x0000008a),
  new Int_64(0x00000000, 0x00000088),
  new Int_64(0x00000000, 0x80008009),
  new Int_64(0x00000000, 0x8000000a),
  new Int_64(0x00000000, 0x8000808b),
  new Int_64(0x80000000, 0x0000008b),
  new Int_64(0x80000000, 0x00008089),
  new Int_64(0x80000000, 0x00008003),
  new Int_64(0x80000000, 0x00008002),
  new Int_64(0x80000000, 0x00000080),
  new Int_64(0x00000000, 0x0000800a),
  new Int_64(0x80000000, 0x8000000a),
  new Int_64(0x80000000, 0x80008081),
  new Int_64(0x80000000, 0x00008080),
  new Int_64(0x00000000, 0x80000001),
  new Int_64(0x80000000, 0x80008008),
];

const r_sha3 = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

/**
 * Gets the state values for the specified SHA-3 variant.
 *
 * @param _variant Unused for this family.
 * @returns The initial state values.
 */
function getNewState(_variant: VariantType): Int_64[][] {
  let i;
  const retVal = [];

  for (i = 0; i < 5; i += 1) {
    retVal[i] = [new Int_64(0, 0), new Int_64(0, 0), new Int_64(0, 0), new Int_64(0, 0), new Int_64(0, 0)];
  }

  return retVal;
}

/**
 * Returns a clone of the given SHA3 state.
 *
 * @param state The state to be cloned.
 * @returns The cloned state.
 */
function cloneSHA3State(state: Int_64[][]): Int_64[][] {
  let i;
  const clone = [];
  for (i = 0; i < 5; i += 1) {
    clone[i] = state[i].slice();
  }

  return clone;
}

/**
 * Performs a round of SHA-3 hashing over a block. This clobbers `state`.
 *
 * @param block The binary array representation of the block to hash.
 * @param state Hash state from a previous round.
 * @returns The resulting state value.
 */
function roundSHA3(block: number[] | null, state: Int_64[][]): Int_64[][] {
  let round, x, y, B;
  const C = [],
    D = [];

  if (null !== block) {
    for (x = 0; x < block.length; x += 2) {
      state[(x >>> 1) % 5][((x >>> 1) / 5) | 0] = xor_64_2(
        state[(x >>> 1) % 5][((x >>> 1) / 5) | 0],
        new Int_64(block[x + 1], block[x])
      );
    }
  }

  for (round = 0; round < 24; round += 1) {
    /* Any SHA-3 variant name will do here */
    B = getNewState("SHA3-384");

    /* Perform theta step */
    for (x = 0; x < 5; x += 1) {
      C[x] = xor_64_5(state[x][0], state[x][1], state[x][2], state[x][3], state[x][4]);
    }
    for (x = 0; x < 5; x += 1) {
      D[x] = xor_64_2(C[(x + 4) % 5], rotl_64(C[(x + 1) % 5], 1));
    }
    for (x = 0; x < 5; x += 1) {
      for (y = 0; y < 5; y += 1) {
        state[x][y] = xor_64_2(state[x][y], D[x]);
      }
    }

    /* Perform combined ro and pi steps */
    for (x = 0; x < 5; x += 1) {
      for (y = 0; y < 5; y += 1) {
        B[y][(2 * x + 3 * y) % 5] = rotl_64(state[x][y], r_sha3[x][y]);
      }
    }

    /* Perform chi step */
    for (x = 0; x < 5; x += 1) {
      for (y = 0; y < 5; y += 1) {
        state[x][y] = xor_64_2(
          B[x][y],
          new Int_64(
            ~B[(x + 1) % 5][y].highOrder & B[(x + 2) % 5][y].highOrder,
            ~B[(x + 1) % 5][y].lowOrder & B[(x + 2) % 5][y].lowOrder
          )
        );
      }
    }

    /* Perform iota step */
    state[0][0] = xor_64_2(state[0][0], rc_sha3[round]);
  }

  return state;
}

/**
 * Finalizes the SHA-3 hash. This clobbers `remainder` and `state`.
 *
 * @param remainder Any leftover unprocessed packed ints that still need to be processed.
 * @param remainderBinLen The number of bits in `remainder`.
 * @param _processedBinLen Unused for this family.
 * @param state The state from a previous round.
 * @param blockSize The block size/rate of the variant in bits
 * @param delimiter The delimiter value for the variant
 * @param outputLen The output length for the variant in bits
 * @returns The array of integers representing the SHA-3 hash of message.
 */
function finalizeSHA3(
  remainder: number[],
  remainderBinLen: number,
  _processedBinLen: number,
  state: Int_64[][],
  blockSize: number,
  delimiter: number,
  outputLen: number
): number[] {
  let i,
    state_offset = 0,
    temp;
  const retVal = [],
    binaryStringInc = blockSize >>> 5,
    remainderIntLen = remainderBinLen >>> 5;

  /* Process as many blocks as possible, some may be here for multiple rounds
		with SHAKE
	*/
  for (i = 0; i < remainderIntLen && remainderBinLen >= blockSize; i += binaryStringInc) {
    state = roundSHA3(remainder.slice(i, i + binaryStringInc), state);
    remainderBinLen -= blockSize;
  }

  remainder = remainder.slice(i);
  remainderBinLen = remainderBinLen % blockSize;

  /* Pad out the remainder to a full block */
  while (remainder.length < binaryStringInc) {
    remainder.push(0);
  }

  /* Find the next "empty" byte for the 0x80 and append it via an xor */
  i = remainderBinLen >>> 3;
  remainder[i >> 2] ^= delimiter << (8 * (i % 4));

  remainder[binaryStringInc - 1] ^= 0x80000000;
  state = roundSHA3(remainder, state);

  while (retVal.length * 32 < outputLen) {
    temp = state[state_offset % 5][(state_offset / 5) | 0];
    retVal.push(temp.lowOrder);
    if (retVal.length * 32 >= outputLen) {
      break;
    }
    retVal.push(temp.highOrder);
    state_offset += 1;

    if (0 === (state_offset * 64) % blockSize) {
      roundSHA3(null, state);
      state_offset = 0;
    }
  }

  return retVal;
}

/**
 * Performs NIST left_encode function returned with no extra garbage bits. `x` is limited to <= 9007199254740991.
 *
 * @param x 32-bit number to to encode.
 * @returns The NIST specified output of the function.
 */
function left_encode(x: number): packedValue {
  let byteOffset,
    byte,
    numEncodedBytes = 0;
  /* JavaScript numbers max out at 0x1FFFFFFFFFFFFF (7 bytes) so this will return a maximum of 7 + 1 = 8 bytes */
  const retVal = [0, 0],
    x_64 = [x & 0xffffffff, (x / TWO_PWR_32) & 0x1fffff];

  for (byteOffset = 6; byteOffset >= 0; byteOffset--) {
    /* This will surprisingly work for large shifts because JavaScript masks the shift amount by 0x1F */
    byte = (x_64[byteOffset >> 2] >>> (8 * byteOffset)) & 0xff;

    /* Starting from the most significant byte of a 64-bit number, start recording the first non-0 byte and then
       every byte thereafter */
    if (byte !== 0 || numEncodedBytes !== 0) {
      retVal[(numEncodedBytes + 1) >> 2] |= byte << ((numEncodedBytes + 1) * 8);
      numEncodedBytes += 1;
    }
  }
  numEncodedBytes = numEncodedBytes !== 0 ? numEncodedBytes : 1;
  retVal[0] |= numEncodedBytes;

  return { value: numEncodedBytes + 1 > 4 ? retVal : [retVal[0]], binLen: 8 + numEncodedBytes * 8 };
}

/**
 * Performs NIST right_encode function returned with no extra garbage bits. `x` is limited to <= 9007199254740991.
 *
 * @param x 32-bit number to to encode.
 * @returns The NIST specified output of the function.
 */
function right_encode(x: number): packedValue {
  let byteOffset,
    byte,
    numEncodedBytes = 0;
  /* JavaScript numbers max out at 0x1FFFFFFFFFFFFF (7 bytes) so this will return a maximum of 7 + 1 = 8 bytes */
  const retVal = [0, 0],
    x_64 = [x & 0xffffffff, (x / TWO_PWR_32) & 0x1fffff];

  for (byteOffset = 6; byteOffset >= 0; byteOffset--) {
    /* This will surprisingly work for large shifts because JavaScript masks the shift amount by 0x1F */
    byte = (x_64[byteOffset >> 2] >>> (8 * byteOffset)) & 0xff;

    /* Starting from the most significant byte of a 64-bit number, start recording the first non-0 byte and then
       every byte thereafter */
    if (byte !== 0 || numEncodedBytes !== 0) {
      retVal[numEncodedBytes >> 2] |= byte << (numEncodedBytes * 8);
      numEncodedBytes += 1;
    }
  }
  numEncodedBytes = numEncodedBytes !== 0 ? numEncodedBytes : 1;
  retVal[numEncodedBytes >> 2] |= numEncodedBytes << (numEncodedBytes * 8);

  return { value: numEncodedBytes + 1 > 4 ? retVal : [retVal[0]], binLen: 8 + numEncodedBytes * 8 };
}

/**
 * Performs NIST encode_string function.
 *
 * @param input Packed array of integers.
 * @returns NIST encode_string output.
 */
function encode_string(input: packedValue): packedValue {
  return packedLEConcat(left_encode(input["binLen"]), input);
}

/**
 * Performs NIST byte_pad function.
 *
 * @param packed Packed array of integers.
 * @param outputByteLen Desired length of the output in bytes, assumed to be a multiple of 4.
 * @returns NIST byte_pad output.
 */
function byte_pad(packed: packedValue, outputByteLen: number): number[] {
  let encodedLen = left_encode(outputByteLen),
    i;

  encodedLen = packedLEConcat(encodedLen, packed);
  const outputIntLen = outputByteLen >>> 2,
    intsToAppend = (outputIntLen - (encodedLen["value"].length % outputIntLen)) % outputIntLen;

  for (i = 0; i < intsToAppend; i++) {
    encodedLen["value"].push(0);
  }

  return encodedLen["value"];
}

/**
 * Parses/validate constructor options for a CSHAKE variant
 *
 * @param options Option given to constructor
 */
function resolveCSHAKEOptions(options: CSHAKEOptionsNoEncodingType): ResolvedCSHAKEOptionsNoEncodingType {
  const resolvedOptions = options || {};

  return {
    funcName: parseInputOption("funcName", resolvedOptions["funcName"], 1, { value: [], binLen: 0 }),
    customization: parseInputOption("Customization", resolvedOptions["customization"], 1, { value: [], binLen: 0 }),
  };
}

/**
 * Parses/validate constructor options for a KMAC variant
 *
 * @param options Option given to constructor
 */
function resolveKMACOptions(options: KMACOptionsNoEncodingType): ResolvedKMACOptionsNoEncodingType {
  const resolvedOptions = options || {};

  return {
    kmacKey: parseInputOption("kmacKey", resolvedOptions["kmacKey"], 1),
    /* This is little-endian packed "KMAC" */
    funcName: { value: [0x43414d4b], binLen: 32 },
    customization: parseInputOption("Customization", resolvedOptions["customization"], 1, { value: [], binLen: 0 }),
  };
}

export default class jsSHA extends jsSHABase<Int_64[][], VariantType> {
  intermediateState: Int_64[][];
  variantBlockSize: number;
  bigEndianMod: -1 | 1;
  outputBinLen: number;
  isVariableLen: boolean;
  HMACSupported: boolean;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
  roundFunc: (block: number[], H: Int_64[][]) => Int_64[][];
  finalizeFunc: (
    remainder: number[],
    remainderBinLen: number,
    processedBinLen: number,
    H: Int_64[][],
    outputLen: number
  ) => number[];
  stateCloneFunc: (state: Int_64[][]) => Int_64[][];
  newStateFunc: (variant: VariantType) => Int_64[][];
  getMAC: ((options: { outputLen: number }) => number[]) | null;

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
    let delimiter = 0x06,
      variantBlockSize = 0;
    super(variant, inputFormat, options);
    const resolvedOptions = options || {};

    /* In other variants, this was done after variable initialization but need to do it earlier here becaue we want to
       avoid KMAC initialization */
    if (this.numRounds !== 1) {
      if (resolvedOptions["kmacKey"] || resolvedOptions["hmacKey"]) {
        throw new Error(mac_rounds_error);
      } else if (this.shaVariant === "CSHAKE128" || this.shaVariant === "CSHAKE256") {
        throw new Error("Cannot set numRounds for CSHAKE variants");
      }
    }

    this.bigEndianMod = 1;
    this.converterFunc = getStrConverter(this.inputFormat, this.utfType, this.bigEndianMod);
    this.roundFunc = roundSHA3;
    this.stateCloneFunc = cloneSHA3State;
    this.newStateFunc = getNewState;
    this.intermediateState = getNewState(variant);

    this.isVariableLen = false;
    switch (variant) {
      case "SHA3-224":
        this.variantBlockSize = variantBlockSize = 1152;
        this.outputBinLen = 224;
        this.HMACSupported = true;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.getMAC = this._getHMAC;
        break;
      case "SHA3-256":
        this.variantBlockSize = variantBlockSize = 1088;
        this.outputBinLen = 256;
        this.HMACSupported = true;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.getMAC = this._getHMAC;
        break;
      case "SHA3-384":
        this.variantBlockSize = variantBlockSize = 832;
        this.outputBinLen = 384;
        this.HMACSupported = true;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.getMAC = this._getHMAC;
        break;
      case "SHA3-512":
        this.variantBlockSize = variantBlockSize = 576;
        this.outputBinLen = 512;
        this.HMACSupported = true;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.getMAC = this._getHMAC;
        break;
      case "SHAKE128":
        delimiter = 0x1f;
        this.variantBlockSize = variantBlockSize = 1344;
        /* This will be set in getHash */
        this.outputBinLen = -1;
        this.isVariableLen = true;
        this.HMACSupported = false;
        this.getMAC = null;
        break;
      case "SHAKE256":
        delimiter = 0x1f;
        this.variantBlockSize = variantBlockSize = 1088;
        /* This will be set in getHash */
        this.outputBinLen = -1;
        this.isVariableLen = true;
        this.HMACSupported = false;
        this.getMAC = null;
        break;
      case "KMAC128":
        delimiter = 0x4;
        this.variantBlockSize = variantBlockSize = 1344;
        this._initializeKMAC(options);
        /* This will be set in getHash */
        this.outputBinLen = -1;
        this.isVariableLen = true;
        this.HMACSupported = false;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.getMAC = this._getKMAC;
        break;
      case "KMAC256":
        delimiter = 0x4;
        this.variantBlockSize = variantBlockSize = 1088;
        this._initializeKMAC(options);
        /* This will be set in getHash */
        this.outputBinLen = -1;
        this.isVariableLen = true;
        this.HMACSupported = false;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.getMAC = this._getKMAC;
        break;
      case "CSHAKE128":
        this.variantBlockSize = variantBlockSize = 1344;
        delimiter = this._initializeCSHAKE(options);
        /* This will be set in getHash */
        this.outputBinLen = -1;
        this.isVariableLen = true;
        this.HMACSupported = false;
        this.getMAC = null;
        break;
      case "CSHAKE256":
        this.variantBlockSize = variantBlockSize = 1088;
        delimiter = this._initializeCSHAKE(options);
        /* This will be set in getHash */
        this.outputBinLen = -1;
        this.isVariableLen = true;
        this.HMACSupported = false;
        this.getMAC = null;
        break;
      default:
        throw new Error(sha_variant_error);
    }

    /* This needs to be down here as CSHAKE can change its delimiter */
    this.finalizeFunc = function (remainder, remainderBinLen, processedBinLen, state, outputBinLen): number[] {
      return finalizeSHA3(
        remainder,
        remainderBinLen,
        processedBinLen,
        state,
        variantBlockSize,
        delimiter,
        outputBinLen
      );
    };

    if (resolvedOptions["hmacKey"]) {
      this._setHMACKey(parseInputOption("hmacKey", resolvedOptions["hmacKey"], this.bigEndianMod));
    }
  }

  /**
   * Initialize CSHAKE variants.
   *
   * @param options Options containing CSHAKE params.
   * @param funcNameOverride Overrides any "funcName" present in `options` (used with KMAC)
   * @returns The delimiter to be used
   */
  protected _initializeCSHAKE(options?: CSHAKEOptionsNoEncodingType, funcNameOverride?: packedValue): number {
    const resolvedOptions = resolveCSHAKEOptions(options || {});
    if (funcNameOverride) {
      resolvedOptions["funcName"] = funcNameOverride;
    }
    const packedParams = packedLEConcat(
      encode_string(resolvedOptions["funcName"]),
      encode_string(resolvedOptions["customization"])
    );

    /* CSHAKE is defined to be a call to SHAKE iff both the customization and function-name string are both empty.  This
       can be accomplished by processing nothing in this step. */
    if (resolvedOptions["customization"]["binLen"] !== 0 || resolvedOptions["funcName"]["binLen"] !== 0) {
      const byte_pad_out = byte_pad(packedParams, this.variantBlockSize >>> 3);
      for (let i = 0; i < byte_pad_out.length; i += this.variantBlockSize >>> 5) {
        this.intermediateState = this.roundFunc(
          byte_pad_out.slice(i, i + (this.variantBlockSize >>> 5)),
          this.intermediateState
        );
        this.processedLen += this.variantBlockSize;
      }
      return 0x04;
    } else {
      return 0x1f;
    }
  }

  /**
   * Initialize KMAC variants.
   *
   * @param options Options containing KMAC params.
   */
  protected _initializeKMAC(options: KMACOptionsNoEncodingType): void {
    const resolvedOptions = resolveKMACOptions(options || {});

    this._initializeCSHAKE(options, resolvedOptions["funcName"]);
    const byte_pad_out = byte_pad(encode_string(resolvedOptions["kmacKey"]), this.variantBlockSize >>> 3);
    for (let i = 0; i < byte_pad_out.length; i += this.variantBlockSize >>> 5) {
      this.intermediateState = this.roundFunc(
        byte_pad_out.slice(i, i + (this.variantBlockSize >>> 5)),
        this.intermediateState
      );
      this.processedLen += this.variantBlockSize;
    }
    this.macKeySet = true;
  }

  /**
   * Returns the the KMAC in the specified format.
   *
   * @param options Hashmap of extra outputs options. `outputLen` must be specified.
   * @returns The KMAC in the format specified.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _getKMAC(options: { outputLen: number }): number[] {
    const concatedRemainder = packedLEConcat(
      { value: this.remainder.slice(), binLen: this.remainderLen },
      right_encode(options["outputLen"])
    );

    return this.finalizeFunc(
      concatedRemainder["value"],
      concatedRemainder["binLen"],
      this.processedLen,
      this.stateCloneFunc(this.intermediateState),
      options["outputLen"]
    );
  }
}
