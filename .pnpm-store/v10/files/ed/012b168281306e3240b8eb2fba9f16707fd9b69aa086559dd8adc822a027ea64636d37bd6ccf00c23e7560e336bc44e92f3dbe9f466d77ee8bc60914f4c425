type EncodingType = "UTF8" | "UTF16BE" | "UTF16LE";
type FormatNoTextType = "HEX" | "B64" | "BYTES" | "ARRAYBUFFER" | "UINT8ARRAY";
type FormatType = "TEXT" | FormatNoTextType;
type GenericInputType = {
    value: string;
    format: "TEXT";
    encoding?: EncodingType;
} | {
    value: string;
    format: "B64" | "HEX" | "BYTES";
} | {
    value: ArrayBuffer;
    format: "ARRAYBUFFER";
} | {
    value: Uint8Array;
    format: "UINT8ARRAY";
};
type FixedLengthOptionsNoEncodingType = {
    hmacKey?: GenericInputType;
} | {
    numRounds?: number;
};
type FixedLengthOptionsEncodingType = {
    hmacKey?: GenericInputType;
    encoding?: EncodingType;
} | {
    numRounds?: number;
    encoding?: EncodingType;
};
interface packedValue {
    value: number[];
    binLen: number;
}
interface SHAKEOptionsNoEncodingType {
    numRounds?: number;
}
interface SHAKEOptionsEncodingType extends SHAKEOptionsNoEncodingType {
    encoding?: EncodingType;
}
interface CSHAKEOptionsNoEncodingType {
    customization?: GenericInputType;
    funcName?: GenericInputType;
}
interface CSHAKEOptionsEncodingType extends CSHAKEOptionsNoEncodingType {
    encoding?: EncodingType;
}
interface KMACOptionsNoEncodingType {
    kmacKey: GenericInputType;
    customization?: GenericInputType;
}
interface KMACOptionsEncodingType extends KMACOptionsNoEncodingType {
    encoding?: EncodingType;
}

declare abstract class jsSHABase<StateT, VariantT> {
    /**
     * @param variant The desired SHA variant.
     * @param inputFormat The input format to be used in future `update` calls.
     * @param options Hashmap of extra input options.
     */
    protected readonly shaVariant: VariantT;
    protected readonly inputFormat: FormatType;
    protected readonly utfType: EncodingType;
    protected readonly numRounds: number;
    protected abstract intermediateState: StateT;
    protected keyWithIPad: number[];
    protected keyWithOPad: number[];
    protected remainder: number[];
    protected remainderLen: number;
    protected updateCalled: boolean;
    protected processedLen: number;
    protected macKeySet: boolean;
    protected abstract readonly variantBlockSize: number;
    protected abstract readonly bigEndianMod: -1 | 1;
    protected abstract readonly outputBinLen: number;
    protected abstract readonly isVariableLen: boolean;
    protected abstract readonly HMACSupported: boolean;
    protected abstract readonly converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
    protected abstract readonly roundFunc: (block: number[], H: StateT) => StateT;
    protected abstract readonly finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: StateT, outputLen: number) => number[];
    protected abstract readonly stateCloneFunc: (state: StateT) => StateT;
    protected abstract readonly newStateFunc: (variant: VariantT) => StateT;
    protected abstract readonly getMAC: ((options: {
        outputLen: number;
    }) => number[]) | null;
    protected constructor(variant: VariantT, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    protected constructor(variant: VariantT, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
    /**
     * Hashes as many blocks as possible.  Stores the rest for either a future update or getHash call.
     *
     * @param srcString The input to be hashed.
     * @returns A reference to the object.
     */
    update(srcString: string | ArrayBuffer | Uint8Array): this;
    /**
     * Returns the desired SHA hash of the input fed in via `update` calls.
     *
     * @param format The desired output formatting
     * @param options Hashmap of output formatting options. `outputLen` must be specified for variable length hashes.
     *   `outputLen` replaces the now deprecated `shakeLen` key.
     * @returns The hash in the format specified.
     */
    getHash(format: "HEX", options?: {
        outputUpper?: boolean;
        outputLen?: number;
        shakeLen?: number;
    }): string;
    getHash(format: "B64", options?: {
        b64Pad?: string;
        outputLen?: number;
        shakeLen?: number;
    }): string;
    getHash(format: "BYTES", options?: {
        outputLen?: number;
        shakeLen?: number;
    }): string;
    getHash(format: "UINT8ARRAY", options?: {
        outputLen?: number;
        shakeLen?: number;
    }): Uint8Array;
    getHash(format: "ARRAYBUFFER", options?: {
        outputLen?: number;
        shakeLen?: number;
    }): ArrayBuffer;
    /**
     * Sets the HMAC key for an eventual `getHMAC` call.  Must be called immediately after jsSHA object instantiation.
     *
     * @param key The key used to calculate the HMAC
     * @param inputFormat The format of key.
     * @param options Hashmap of extra input options.
     */
    setHMACKey(key: string, inputFormat: "TEXT", options?: {
        encoding?: EncodingType;
    }): void;
    setHMACKey(key: string, inputFormat: "B64" | "HEX" | "BYTES"): void;
    setHMACKey(key: ArrayBuffer, inputFormat: "ARRAYBUFFER"): void;
    setHMACKey(key: Uint8Array, inputFormat: "UINT8ARRAY"): void;
    /**
     * Internal function that sets the MAC key.
     *
     * @param key The packed MAC key to use
     */
    protected _setHMACKey(key: packedValue): void;
    /**
     * Returns the the HMAC in the specified format using the key given by a previous `setHMACKey` call.
     *
     * @param format The desired output formatting.
     * @param options Hashmap of extra outputs options.
     * @returns The HMAC in the format specified.
     */
    getHMAC(format: "HEX", options?: {
        outputUpper?: boolean;
    }): string;
    getHMAC(format: "B64", options?: {
        b64Pad?: string;
    }): string;
    getHMAC(format: "BYTES"): string;
    getHMAC(format: "UINT8ARRAY"): Uint8Array;
    getHMAC(format: "ARRAYBUFFER"): ArrayBuffer;
    /**
     * Internal function that returns the "raw" HMAC
     */
    protected _getHMAC(): number[];
}

/**
 * Int_64 is a object for 2 32-bit numbers emulating a 64-bit number.
 */
declare class Int_64 {
    /**
     * @param msint_32 The most significant 32-bits of a 64-bit number.
     * @param lsint_32 The least significant 32-bits of a 64-bit number.
     */
    readonly highOrder: number;
    readonly lowOrder: number;
    constructor(msint_32: number, lsint_32: number);
}

type FixedLengthVariantType = "SHA3-224" | "SHA3-256" | "SHA3-384" | "SHA3-512" | "SHAKE128" | "SHAKE256";
type VariantType = FixedLengthVariantType | "SHAKE128" | "SHAKE256" | "CSHAKE128" | "CSHAKE256" | "KMAC128" | "KMAC256";
declare class jsSHA extends jsSHABase<Int_64[][], VariantType> {
    intermediateState: Int_64[][];
    variantBlockSize: number;
    bigEndianMod: -1 | 1;
    outputBinLen: number;
    isVariableLen: boolean;
    HMACSupported: boolean;
    converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
    roundFunc: (block: number[], H: Int_64[][]) => Int_64[][];
    finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: Int_64[][], outputLen: number) => number[];
    stateCloneFunc: (state: Int_64[][]) => Int_64[][];
    newStateFunc: (variant: VariantType) => Int_64[][];
    getMAC: ((options: {
        outputLen: number;
    }) => number[]) | null;
    constructor(variant: FixedLengthVariantType, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    constructor(variant: FixedLengthVariantType, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
    constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: "TEXT", options?: SHAKEOptionsEncodingType);
    constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: FormatNoTextType, options?: SHAKEOptionsNoEncodingType);
    constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: "TEXT", options?: CSHAKEOptionsEncodingType);
    constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: FormatNoTextType, options?: CSHAKEOptionsNoEncodingType);
    constructor(variant: "KMAC128" | "KMAC256", inputFormat: "TEXT", options: KMACOptionsEncodingType);
    constructor(variant: "KMAC128" | "KMAC256", inputFormat: FormatNoTextType, options: KMACOptionsNoEncodingType);
    /**
     * Initialize CSHAKE variants.
     *
     * @param options Options containing CSHAKE params.
     * @param funcNameOverride Overrides any "funcName" present in `options` (used with KMAC)
     * @returns The delimiter to be used
     */
    protected _initializeCSHAKE(options?: CSHAKEOptionsNoEncodingType, funcNameOverride?: packedValue): number;
    /**
     * Initialize KMAC variants.
     *
     * @param options Options containing KMAC params.
     */
    protected _initializeKMAC(options: KMACOptionsNoEncodingType): void;
    /**
     * Returns the the KMAC in the specified format.
     *
     * @param options Hashmap of extra outputs options. `outputLen` must be specified.
     * @returns The KMAC in the format specified.
     */
    protected _getKMAC(options: {
        outputLen: number;
    }): number[];
}

export { jsSHA as default };
