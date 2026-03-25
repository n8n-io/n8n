import { toSPKI as exportPublic } from '../runtime/asn1.js';
import { toPKCS8 as exportPrivate } from '../runtime/asn1.js';
import keyToJWK from '../runtime/key_to_jwk.js';
export async function exportSPKI(key) {
    return exportPublic(key);
}
export async function exportPKCS8(key) {
    return exportPrivate(key);
}
export async function exportJWK(key) {
    return keyToJWK(key);
}
