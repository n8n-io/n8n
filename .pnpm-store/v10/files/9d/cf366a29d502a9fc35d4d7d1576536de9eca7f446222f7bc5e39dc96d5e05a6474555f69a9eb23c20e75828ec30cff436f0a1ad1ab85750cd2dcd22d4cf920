import { JWEInvalid } from '../util/errors.js';
export function checkCekLength(cek, expected) {
    const actual = cek.byteLength << 3;
    if (actual !== expected) {
        throw new JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
    }
}
