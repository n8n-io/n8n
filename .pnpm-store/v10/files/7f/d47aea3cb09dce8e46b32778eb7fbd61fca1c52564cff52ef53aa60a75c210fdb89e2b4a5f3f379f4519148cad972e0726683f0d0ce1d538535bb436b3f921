import { getStrConverter, getOutputConverter } from "./converters";

import {
  FormatType,
  EncodingType,
  FixedLengthOptionsEncodingType,
  FixedLengthOptionsNoEncodingType,
  FormatNoTextType,
  packedValue,
  GenericInputType,
} from "./custom_types";

export const TWO_PWR_32 = 4294967296;

/* Constant used in SHA-2 families */
export const K_sha2 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
];

/* Constant used in SHA-2 families */
export const H_trunc = [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4];

/* Constant used in SHA-2 families */
export const H_full = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

export const sha_variant_error = "Chosen SHA variant is not supported";
export const mac_rounds_error = "Cannot set numRounds with MAC";

/**
 * Concatenates 2 packed arrays. Clobbers array `a`.
 *
 * @param a First array to concatenate.
 * @param b Second array to concatenate.
 * @returns The concatentation of `a` + `b`.
 */
export function packedLEConcat(a: packedValue, b: packedValue): packedValue {
  let i, arrOffset;
  const aByteLen = a["binLen"] >>> 3,
    bByteLen = b["binLen"] >>> 3,
    leftShiftAmount = aByteLen << 3,
    rightShiftAmount = (4 - aByteLen) << 3;

  /* If a only contains "full" integers, we can just use concat which is so much easier */
  if (aByteLen % 4 !== 0) {
    for (i = 0; i < bByteLen; i += 4) {
      arrOffset = (aByteLen + i) >>> 2;
      /* Left shift chops off bits over 32-bits */
      a["value"][arrOffset] |= b["value"][i >>> 2] << leftShiftAmount;
      a["value"].push(0);
      a["value"][arrOffset + 1] |= b["value"][i >>> 2] >>> rightShiftAmount;
    }

    /* Since an unconditional push was performed above, we may have pushed an extra value if it could have been
       encoded without it.  Check if popping an int off (reducing total length by 4 bytes) is still bigger than the
       needed size. */
    if ((a["value"].length << 2) - 4 >= bByteLen + aByteLen) {
      a["value"].pop();
    }

    return { value: a["value"], binLen: a["binLen"] + b["binLen"] };
  } else {
    return { value: a["value"].concat(b["value"]), binLen: a["binLen"] + b["binLen"] };
  }
}

/**
 * Validate hash list containing output formatting options, ensuring presence of every option or adding the default
 * value.
 *
 * @param options Hashmap of output formatting options from user.
 * @returns Validated hashmap containing output formatting options.
 */
export function getOutputOpts(options?: {
  outputUpper?: boolean;
  b64Pad?: string;
  shakeLen?: number;
  outputLen?: number;
}): { outputUpper: boolean; b64Pad: string; outputLen: number } {
  const retVal = { outputUpper: false, b64Pad: "=", outputLen: -1 },
    outputOptions: { outputUpper?: boolean; b64Pad?: string; shakeLen?: number; outputLen?: number } = options || {},
    lenErrstr = "Output length must be a multiple of 8";

  retVal["outputUpper"] = outputOptions["outputUpper"] || false;

  if (outputOptions["b64Pad"]) {
    retVal["b64Pad"] = outputOptions["b64Pad"];
  }

  if (outputOptions["outputLen"]) {
    if (outputOptions["outputLen"] % 8 !== 0) {
      throw new Error(lenErrstr);
    }
    retVal["outputLen"] = outputOptions["outputLen"];
  } else if (outputOptions["shakeLen"]) {
    if (outputOptions["shakeLen"] % 8 !== 0) {
      throw new Error(lenErrstr);
    }
    retVal["outputLen"] = outputOptions["shakeLen"];
  }

  if ("boolean" !== typeof retVal["outputUpper"]) {
    throw new Error("Invalid outputUpper formatting option");
  }

  if ("string" !== typeof retVal["b64Pad"]) {
    throw new Error("Invalid b64Pad formatting option");
  }

  return retVal;
}

/**
 * Parses an external constructor object and returns a packed number, if possible.
 *
 * @param key The human-friendly key name to prefix any errors with
 * @param value The input value object to parse
 * @param bigEndianMod Modifier for whether hash function is big or small endian.
 * @param fallback Fallback value if `value` is undefined.  If not present and `value` is undefined, an Error is thrown
 */
export function parseInputOption(
  key: string,
  value: GenericInputType | undefined,
  bigEndianMod: -1 | 1,
  fallback?: packedValue
): packedValue {
  const errStr = key + " must include a value and format";
  if (!value) {
    if (!fallback) {
      throw new Error(errStr);
    }
    return fallback;
  }

  if (typeof value["value"] === "undefined" || !value["format"]) {
    throw new Error(errStr);
  }

  return getStrConverter(
    value["format"],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - the value of encoding gets value checked by getStrConverter
    value["encoding"] || "UTF8",
    bigEndianMod
  )(value["value"]);
}

export abstract class jsSHABase<StateT, VariantT> {
  /**
   * @param variant The desired SHA variant.
   * @param inputFormat The input format to be used in future `update` calls.
   * @param options Hashmap of extra input options.
   */
  /* Needed inputs */
  protected readonly shaVariant: VariantT;
  protected readonly inputFormat: FormatType;
  protected readonly utfType: EncodingType;
  protected readonly numRounds: number;

  /* State */
  protected abstract intermediateState: StateT;
  protected keyWithIPad: number[];
  protected keyWithOPad: number[];
  protected remainder: number[];
  protected remainderLen: number;
  protected updateCalled: boolean;
  protected processedLen: number;
  protected macKeySet: boolean;

  /* Variant specifics */
  protected abstract readonly variantBlockSize: number;
  protected abstract readonly bigEndianMod: -1 | 1;
  protected abstract readonly outputBinLen: number;
  protected abstract readonly isVariableLen: boolean;
  protected abstract readonly HMACSupported: boolean;

  /* Functions */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  protected abstract readonly converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
  protected abstract readonly roundFunc: (block: number[], H: StateT) => StateT;
  protected abstract readonly finalizeFunc: (
    remainder: number[],
    remainderBinLen: number,
    processedBinLen: number,
    H: StateT,
    outputLen: number
  ) => number[];
  protected abstract readonly stateCloneFunc: (state: StateT) => StateT;
  protected abstract readonly newStateFunc: (variant: VariantT) => StateT;
  protected abstract readonly getMAC: ((options: { outputLen: number }) => number[]) | null;

  protected constructor(variant: VariantT, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
  protected constructor(variant: VariantT, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected constructor(variant: any, inputFormat: any, options?: any) {
    const inputOptions = options || {};
    this.inputFormat = inputFormat;

    this.utfType = inputOptions["encoding"] || "UTF8";
    this.numRounds = inputOptions["numRounds"] || 1;

    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore - The spec actually says ToString is called on the first parseInt argument so it's OK to use it here
    // to check if an arugment is an integer. This cheat would break if it's used to get the value of the argument.
    if (isNaN(this.numRounds) || this.numRounds !== parseInt(this.numRounds, 10) || 1 > this.numRounds) {
      throw new Error("numRounds must a integer >= 1");
    }

    this.shaVariant = variant;
    this.remainder = [];
    this.remainderLen = 0;
    this.updateCalled = false;
    this.processedLen = 0;
    this.macKeySet = false;
    this.keyWithIPad = [];
    this.keyWithOPad = [];
  }

  /**
   * Hashes as many blocks as possible.  Stores the rest for either a future update or getHash call.
   *
   * @param srcString The input to be hashed.
   * @returns A reference to the object.
   */
  update(srcString: string | ArrayBuffer | Uint8Array): this {
    let i,
      updateProcessedLen = 0;
    const variantBlockIntInc = this.variantBlockSize >>> 5,
      convertRet = this.converterFunc(srcString, this.remainder, this.remainderLen),
      chunkBinLen = convertRet["binLen"],
      chunk = convertRet["value"],
      chunkIntLen = chunkBinLen >>> 5;

    for (i = 0; i < chunkIntLen; i += variantBlockIntInc) {
      if (updateProcessedLen + this.variantBlockSize <= chunkBinLen) {
        this.intermediateState = this.roundFunc(chunk.slice(i, i + variantBlockIntInc), this.intermediateState);
        updateProcessedLen += this.variantBlockSize;
      }
    }
    this.processedLen += updateProcessedLen;
    this.remainder = chunk.slice(updateProcessedLen >>> 5);
    this.remainderLen = chunkBinLen % this.variantBlockSize;
    this.updateCalled = true;

    return this;
  }

  /**
   * Returns the desired SHA hash of the input fed in via `update` calls.
   *
   * @param format The desired output formatting
   * @param options Hashmap of output formatting options. `outputLen` must be specified for variable length hashes.
   *   `outputLen` replaces the now deprecated `shakeLen` key.
   * @returns The hash in the format specified.
   */
  getHash(format: "HEX", options?: { outputUpper?: boolean; outputLen?: number; shakeLen?: number }): string;
  getHash(format: "B64", options?: { b64Pad?: string; outputLen?: number; shakeLen?: number }): string;
  getHash(format: "BYTES", options?: { outputLen?: number; shakeLen?: number }): string;
  getHash(format: "UINT8ARRAY", options?: { outputLen?: number; shakeLen?: number }): Uint8Array;
  getHash(format: "ARRAYBUFFER", options?: { outputLen?: number; shakeLen?: number }): ArrayBuffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHash(format: any, options?: any): any {
    let i,
      finalizedState,
      outputBinLen = this.outputBinLen;

    const outputOptions = getOutputOpts(options);

    if (this.isVariableLen) {
      if (outputOptions["outputLen"] === -1) {
        throw new Error("Output length must be specified in options");
      }
      outputBinLen = outputOptions["outputLen"];
    }

    const formatFunc = getOutputConverter(format, outputBinLen, this.bigEndianMod, outputOptions);
    if (this.macKeySet && this.getMAC) {
      return formatFunc(this.getMAC(outputOptions));
    }

    finalizedState = this.finalizeFunc(
      this.remainder.slice(),
      this.remainderLen,
      this.processedLen,
      this.stateCloneFunc(this.intermediateState),
      outputBinLen
    );
    for (i = 1; i < this.numRounds; i += 1) {
      /* Need to mask out bits that should be zero due to output not being a multiple of 32 */
      if (this.isVariableLen && outputBinLen % 32 !== 0) {
        finalizedState[finalizedState.length - 1] &= 0x00ffffff >>> (24 - (outputBinLen % 32));
      }
      finalizedState = this.finalizeFunc(
        finalizedState,
        outputBinLen,
        0,
        this.newStateFunc(this.shaVariant),
        outputBinLen
      );
    }

    return formatFunc(finalizedState);
  }

  /**
   * Sets the HMAC key for an eventual `getHMAC` call.  Must be called immediately after jsSHA object instantiation.
   *
   * @param key The key used to calculate the HMAC
   * @param inputFormat The format of key.
   * @param options Hashmap of extra input options.
   */
  setHMACKey(key: string, inputFormat: "TEXT", options?: { encoding?: EncodingType }): void;
  setHMACKey(key: string, inputFormat: "B64" | "HEX" | "BYTES"): void;
  setHMACKey(key: ArrayBuffer, inputFormat: "ARRAYBUFFER"): void;
  setHMACKey(key: Uint8Array, inputFormat: "UINT8ARRAY"): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setHMACKey(key: any, inputFormat: any, options?: any): void {
    if (!this.HMACSupported) {
      throw new Error("Variant does not support HMAC");
    }

    if (this.updateCalled) {
      throw new Error("Cannot set MAC key after calling update");
    }

    const keyOptions = options || {},
      keyConverterFunc = getStrConverter(inputFormat, keyOptions["encoding"] || "UTF8", this.bigEndianMod);

    this._setHMACKey(keyConverterFunc(key));
  }

  /**
   * Internal function that sets the MAC key.
   *
   * @param key The packed MAC key to use
   */
  protected _setHMACKey(key: packedValue): void {
    const blockByteSize = this.variantBlockSize >>> 3,
      lastArrayIndex = blockByteSize / 4 - 1;
    let i;
    if (this.numRounds !== 1) {
      throw new Error(mac_rounds_error);
    }

    if (this.macKeySet) {
      throw new Error("MAC key already set");
    }

    /* Figure out what to do with the key based on its size relative to
     * the hash's block size */
    if (blockByteSize < key["binLen"] / 8) {
      key["value"] = this.finalizeFunc(
        key["value"],
        key["binLen"],
        0,
        this.newStateFunc(this.shaVariant),
        this.outputBinLen
      );
    }
    while (key["value"].length <= lastArrayIndex) {
      key["value"].push(0);
    }
    /* Create ipad and opad */
    for (i = 0; i <= lastArrayIndex; i += 1) {
      this.keyWithIPad[i] = key["value"][i] ^ 0x36363636;
      this.keyWithOPad[i] = key["value"][i] ^ 0x5c5c5c5c;
    }

    this.intermediateState = this.roundFunc(this.keyWithIPad, this.intermediateState);
    this.processedLen = this.variantBlockSize;

    this.macKeySet = true;
  }

  /**
   * Returns the the HMAC in the specified format using the key given by a previous `setHMACKey` call.
   *
   * @param format The desired output formatting.
   * @param options Hashmap of extra outputs options.
   * @returns The HMAC in the format specified.
   */
  getHMAC(format: "HEX", options?: { outputUpper?: boolean }): string;
  getHMAC(format: "B64", options?: { b64Pad?: string }): string;
  getHMAC(format: "BYTES"): string;
  getHMAC(format: "UINT8ARRAY"): Uint8Array;
  getHMAC(format: "ARRAYBUFFER"): ArrayBuffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHMAC(format: any, options?: any): any {
    const outputOptions = getOutputOpts(options),
      formatFunc = getOutputConverter(format, this.outputBinLen, this.bigEndianMod, outputOptions);

    return formatFunc(this._getHMAC());
  }

  /**
   * Internal function that returns the "raw" HMAC
   */
  protected _getHMAC(): number[] {
    let finalizedState;

    if (!this.macKeySet) {
      throw new Error("Cannot call getHMAC without first setting MAC key");
    }

    const firstHash = this.finalizeFunc(
      this.remainder.slice(),
      this.remainderLen,
      this.processedLen,
      this.stateCloneFunc(this.intermediateState),
      this.outputBinLen
    );
    finalizedState = this.roundFunc(this.keyWithOPad, this.newStateFunc(this.shaVariant));
    finalizedState = this.finalizeFunc(
      firstHash,
      this.outputBinLen,
      this.variantBlockSize,
      finalizedState,
      this.outputBinLen
    );

    return finalizedState;
  }
}
