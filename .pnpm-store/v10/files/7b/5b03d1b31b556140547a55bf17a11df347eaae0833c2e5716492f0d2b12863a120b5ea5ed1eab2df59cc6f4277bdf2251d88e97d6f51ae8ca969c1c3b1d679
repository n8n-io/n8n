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

declare class jsSHA extends jsSHABase<number[], "SHA-1"> {
    intermediateState: number[];
    variantBlockSize: number;
    bigEndianMod: -1 | 1;
    outputBinLen: number;
    isVariableLen: boolean;
    HMACSupported: boolean;
    converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
    roundFunc: (block: number[], H: number[]) => number[];
    finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: number[]) => number[];
    stateCloneFunc: (state: number[]) => number[];
    newStateFunc: (variant: "SHA-1") => number[];
    getMAC: () => number[];
    constructor(variant: "SHA-1", inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    constructor(variant: "SHA-1", inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
}

export { jsSHA as default };
