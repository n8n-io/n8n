import { toSPKI as exportPublic, toPKCS8 as exportPrivate } from '../lib/asn1.js';
import { keyToJWK } from '../lib/key_to_jwk.js';
export async function exportSPKI(key) {
    return exportPublic(key);
}
export async function exportPKCS8(key) {
    return exportPrivate(key);
}
export async function exportJWK(key) {
    return keyToJWK(key);
}
