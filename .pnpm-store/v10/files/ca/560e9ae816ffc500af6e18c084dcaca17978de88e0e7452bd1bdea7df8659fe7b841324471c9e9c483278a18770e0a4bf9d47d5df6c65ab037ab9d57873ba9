import { decode } from '../util/base64url.js';
export const unprotected = Symbol();
export function assertNotSet(value, name) {
    if (value) {
        throw new TypeError(`${name} can only be called once`);
    }
}
export function decodeBase64url(value, label, ErrorClass) {
    try {
        return decode(value);
    }
    catch {
        throw new ErrorClass(`Failed to base64url decode the ${label}`);
    }
}
export async function digest(algorithm, data) {
    const subtleDigest = `SHA-${algorithm.slice(-3)}`;
    return new Uint8Array(await crypto.subtle.digest(subtleDigest, data));
}
