/// <reference types="node" />
import * as crypto from "crypto";
import { type SignatureAlgorithm } from "./types";
export declare class RsaSha1 implements SignatureAlgorithm {
    getSignature: {
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike): string;
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike, args_2: import("./types").ErrorFirstCallback<string>): void;
    };
    verifySignature: {
        (material: string, key: crypto.KeyLike, signatureValue: string): boolean;
        (material: string, key: crypto.KeyLike, signatureValue: string, args_3: import("./types").ErrorFirstCallback<boolean>): void;
    };
    getAlgorithmName: () => string;
}
export declare class RsaSha256 implements SignatureAlgorithm {
    getSignature: {
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike): string;
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike, args_2: import("./types").ErrorFirstCallback<string>): void;
    };
    verifySignature: {
        (material: string, key: crypto.KeyLike, signatureValue: string): boolean;
        (material: string, key: crypto.KeyLike, signatureValue: string, args_3: import("./types").ErrorFirstCallback<boolean>): void;
    };
    getAlgorithmName: () => string;
}
export declare class RsaSha512 implements SignatureAlgorithm {
    getSignature: {
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike): string;
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike, args_2: import("./types").ErrorFirstCallback<string>): void;
    };
    verifySignature: {
        (material: string, key: crypto.KeyLike, signatureValue: string): boolean;
        (material: string, key: crypto.KeyLike, signatureValue: string, args_3: import("./types").ErrorFirstCallback<boolean>): void;
    };
    getAlgorithmName: () => string;
}
export declare class HmacSha1 implements SignatureAlgorithm {
    getSignature: {
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike): string;
        (signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike, args_2: import("./types").ErrorFirstCallback<string>): void;
    };
    verifySignature: {
        (material: string, key: crypto.KeyLike, signatureValue: string): boolean;
        (material: string, key: crypto.KeyLike, signatureValue: string, args_3: import("./types").ErrorFirstCallback<boolean>): void;
    };
    getAlgorithmName: () => string;
}
