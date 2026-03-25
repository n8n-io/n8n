/* No actual code can go in this file without changing rollup.config.js and .gitignore */
export type EncodingType = "UTF8" | "UTF16BE" | "UTF16LE";
export type FormatNoTextType = "HEX" | "B64" | "BYTES" | "ARRAYBUFFER" | "UINT8ARRAY";
export type FormatType = "TEXT" | FormatNoTextType;

export type GenericInputType =
  | {
      value: string;
      format: "TEXT";
      encoding?: EncodingType;
    }
  | {
      value: string;
      format: "B64" | "HEX" | "BYTES";
    }
  | {
      value: ArrayBuffer;
      format: "ARRAYBUFFER";
    }
  | {
      value: Uint8Array;
      format: "UINT8ARRAY";
    };

export type FixedLengthOptionsNoEncodingType =
  | {
      hmacKey?: GenericInputType;
    }
  | {
      numRounds?: number;
    };

export type FixedLengthOptionsEncodingType =
  | {
      hmacKey?: GenericInputType;
      encoding?: EncodingType;
    }
  | {
      numRounds?: number;
      encoding?: EncodingType;
    };

export interface packedValue {
  value: number[];
  binLen: number;
}

export interface SHAKEOptionsNoEncodingType {
  numRounds?: number;
}

export interface SHAKEOptionsEncodingType extends SHAKEOptionsNoEncodingType {
  encoding?: EncodingType;
}

export interface CSHAKEOptionsNoEncodingType {
  customization?: GenericInputType;
  funcName?: GenericInputType;
}

export interface CSHAKEOptionsEncodingType extends CSHAKEOptionsNoEncodingType {
  encoding?: EncodingType;
}

export interface KMACOptionsNoEncodingType {
  kmacKey: GenericInputType;
  customization?: GenericInputType;
}

export interface KMACOptionsEncodingType extends KMACOptionsNoEncodingType {
  encoding?: EncodingType;
}

export interface ResolvedCSHAKEOptionsNoEncodingType {
  funcName: packedValue;
  customization: packedValue;
}

export interface ResolvedKMACOptionsNoEncodingType extends ResolvedCSHAKEOptionsNoEncodingType {
  kmacKey: packedValue;
}
