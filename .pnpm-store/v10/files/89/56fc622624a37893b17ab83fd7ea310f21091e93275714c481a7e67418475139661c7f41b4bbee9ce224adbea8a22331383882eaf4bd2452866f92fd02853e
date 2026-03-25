export { exportKeyJwk } from "./common.js";
export function encrypt(key: CryptoKey, data: Uint8Array<ArrayBuffer>): PromiseLike<Uint8Array<ArrayBuffer>>;
export function decrypt(key: CryptoKey, data: Uint8Array<ArrayBuffer>): PromiseLike<Uint8Array>;
export function generateKeyPair({ extractable, usages }?: {
    extractable?: boolean | undefined;
    usages?: Usages | undefined;
}): Promise<CryptoKeyPair>;
export function importKeyJwk(jwk: any, { extractable, usages }?: {
    extractable?: boolean | undefined;
    usages?: Usages | undefined;
}): Promise<CryptoKey>;
export type Usages = Array<"encrypt" | "decrypt">;
//# sourceMappingURL=rsa-oaep.d.ts.map