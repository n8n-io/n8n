import { JWEInvalid, JOSENotSupported } from '../util/errors.js';
import isKeyObject from './is_key_object.js';
const checkCekLength = (enc, cek) => {
    let expected;
    switch (enc) {
        case 'A128CBC-HS256':
        case 'A192CBC-HS384':
        case 'A256CBC-HS512':
            expected = parseInt(enc.slice(-3), 10);
            break;
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM':
            expected = parseInt(enc.slice(1, 4), 10);
            break;
        default:
            throw new JOSENotSupported(`Content Encryption Algorithm ${enc} is not supported either by JOSE or your javascript runtime`);
    }
    if (cek instanceof Uint8Array) {
        const actual = cek.byteLength << 3;
        if (actual !== expected) {
            throw new JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
        }
        return;
    }
    if (isKeyObject(cek) && cek.type === 'secret') {
        const actual = cek.symmetricKeySize << 3;
        if (actual !== expected) {
            throw new JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
        }
        return;
    }
    throw new TypeError('Invalid Content Encryption Key type');
};
export default checkCekLength;
