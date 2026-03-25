export function encrypt(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>>;
export function decrypt(key: CryptoKey, data: Uint8Array<ArrayBuffer>): PromiseLike<Uint8Array>;
export function importKeyJwk(jwk: any, { usages, extractable }?: {
    usages?: Usages | undefined;
    extractable?: boolean | undefined;
}): Promise<CryptoKey>;
export function importKeyRaw(raw: Uint8Array<ArrayBuffer>, { usages, extractable }?: {
    usages?: Usages | undefined;
    extractable?: boolean | undefined;
}): Promise<CryptoKey>;
export function deriveKey(secret: Uint8Array<ArrayBuffer> | string, salt: Uint8Array<ArrayBuffer> | string, { extractable, usages }?: {
    extractable?: boolean | undefined;
    usages?: Usages | undefined;
}): Promise<CryptoKey>;
export type Usages = Array<"encrypt" | "decrypt">;
export { exportKeyJwk, exportKeyRaw } from "./common.js";
//# sourceMappingURL=aes-gcm.d.ts.map