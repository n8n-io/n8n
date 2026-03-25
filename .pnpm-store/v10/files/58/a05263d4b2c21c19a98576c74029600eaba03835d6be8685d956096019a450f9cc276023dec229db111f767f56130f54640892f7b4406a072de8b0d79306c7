import { encoder, decoder } from '../lib/buffer_utils.js';
import { encodeBase64, decodeBase64 } from '../lib/base64.js';
export function decode(input) {
    if (Uint8Array.fromBase64) {
        return Uint8Array.fromBase64(typeof input === 'string' ? input : decoder.decode(input), {
            alphabet: 'base64url',
        });
    }
    let encoded = input;
    if (encoded instanceof Uint8Array) {
        encoded = decoder.decode(encoded);
    }
    encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    try {
        return decodeBase64(encoded);
    }
    catch {
        throw new TypeError('The input to be decoded is not correctly encoded.');
    }
}
export function encode(input) {
    let unencoded = input;
    if (typeof unencoded === 'string') {
        unencoded = encoder.encode(unencoded);
    }
    if (Uint8Array.prototype.toBase64) {
        return unencoded.toBase64({ alphabet: 'base64url', omitPadding: true });
    }
    return encodeBase64(unencoded).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
