import { invalidKeyInput } from './invalid_key_input.js';
import { encodeBase64, decodeBase64 } from '../lib/base64.js';
import { JOSENotSupported } from '../util/errors.js';
import { isCryptoKey, isKeyObject } from './is_key_like.js';
const formatPEM = (b64, descriptor) => {
    const newlined = (b64.match(/.{1,64}/g) || []).join('\n');
    return `-----BEGIN ${descriptor}-----\n${newlined}\n-----END ${descriptor}-----`;
};
const genericExport = async (keyType, keyFormat, key) => {
    if (isKeyObject(key)) {
        if (key.type !== keyType) {
            throw new TypeError(`key is not a ${keyType} key`);
        }
        return key.export({ format: 'pem', type: keyFormat });
    }
    if (!isCryptoKey(key)) {
        throw new TypeError(invalidKeyInput(key, 'CryptoKey', 'KeyObject'));
    }
    if (!key.extractable) {
        throw new TypeError('CryptoKey is not extractable');
    }
    if (key.type !== keyType) {
        throw new TypeError(`key is not a ${keyType} key`);
    }
    return formatPEM(encodeBase64(new Uint8Array(await crypto.subtle.exportKey(keyFormat, key))), `${keyType.toUpperCase()} KEY`);
};
export const toSPKI = (key) => genericExport('public', 'spki', key);
export const toPKCS8 = (key) => genericExport('private', 'pkcs8', key);
const bytesEqual = (a, b) => {
    if (a.byteLength !== b.length)
        return false;
    for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
};
const createASN1State = (data) => ({ data, pos: 0 });
const parseLength = (state) => {
    const first = state.data[state.pos++];
    if (first & 0x80) {
        const lengthOfLen = first & 0x7f;
        let length = 0;
        for (let i = 0; i < lengthOfLen; i++) {
            length = (length << 8) | state.data[state.pos++];
        }
        return length;
    }
    return first;
};
const skipElement = (state, count = 1) => {
    if (count <= 0)
        return;
    state.pos++;
    const length = parseLength(state);
    state.pos += length;
    if (count > 1) {
        skipElement(state, count - 1);
    }
};
const expectTag = (state, expectedTag, errorMessage) => {
    if (state.data[state.pos++] !== expectedTag) {
        throw new Error(errorMessage);
    }
};
const getSubarray = (state, length) => {
    const result = state.data.subarray(state.pos, state.pos + length);
    state.pos += length;
    return result;
};
const parseAlgorithmOID = (state) => {
    expectTag(state, 0x06, 'Expected algorithm OID');
    const oidLen = parseLength(state);
    return getSubarray(state, oidLen);
};
function parsePKCS8Header(state) {
    expectTag(state, 0x30, 'Invalid PKCS#8 structure');
    parseLength(state);
    expectTag(state, 0x02, 'Expected version field');
    const verLen = parseLength(state);
    state.pos += verLen;
    expectTag(state, 0x30, 'Expected algorithm identifier');
    const algIdLen = parseLength(state);
    const algIdStart = state.pos;
    return { algIdStart, algIdLength: algIdLen };
}
function parseSPKIHeader(state) {
    expectTag(state, 0x30, 'Invalid SPKI structure');
    parseLength(state);
    expectTag(state, 0x30, 'Expected algorithm identifier');
    const algIdLen = parseLength(state);
    const algIdStart = state.pos;
    return { algIdStart, algIdLength: algIdLen };
}
const parseECAlgorithmIdentifier = (state) => {
    const algOid = parseAlgorithmOID(state);
    if (bytesEqual(algOid, [0x2b, 0x65, 0x6e])) {
        return 'X25519';
    }
    if (!bytesEqual(algOid, [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01])) {
        throw new Error('Unsupported key algorithm');
    }
    expectTag(state, 0x06, 'Expected curve OID');
    const curveOidLen = parseLength(state);
    const curveOid = getSubarray(state, curveOidLen);
    for (const { name, oid } of [
        { name: 'P-256', oid: [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07] },
        { name: 'P-384', oid: [0x2b, 0x81, 0x04, 0x00, 0x22] },
        { name: 'P-521', oid: [0x2b, 0x81, 0x04, 0x00, 0x23] },
    ]) {
        if (bytesEqual(curveOid, oid)) {
            return name;
        }
    }
    throw new Error('Unsupported named curve');
};
const genericImport = async (keyFormat, keyData, alg, options) => {
    let algorithm;
    let keyUsages;
    const isPublic = keyFormat === 'spki';
    const getSigUsages = () => (isPublic ? ['verify'] : ['sign']);
    const getEncUsages = () => isPublic ? ['encrypt', 'wrapKey'] : ['decrypt', 'unwrapKey'];
    switch (alg) {
        case 'PS256':
        case 'PS384':
        case 'PS512':
            algorithm = { name: 'RSA-PSS', hash: `SHA-${alg.slice(-3)}` };
            keyUsages = getSigUsages();
            break;
        case 'RS256':
        case 'RS384':
        case 'RS512':
            algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: `SHA-${alg.slice(-3)}` };
            keyUsages = getSigUsages();
            break;
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512':
            algorithm = {
                name: 'RSA-OAEP',
                hash: `SHA-${parseInt(alg.slice(-3), 10) || 1}`,
            };
            keyUsages = getEncUsages();
            break;
        case 'ES256':
        case 'ES384':
        case 'ES512': {
            const curveMap = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };
            algorithm = { name: 'ECDSA', namedCurve: curveMap[alg] };
            keyUsages = getSigUsages();
            break;
        }
        case 'ECDH-ES':
        case 'ECDH-ES+A128KW':
        case 'ECDH-ES+A192KW':
        case 'ECDH-ES+A256KW': {
            try {
                const namedCurve = options.getNamedCurve(keyData);
                algorithm = namedCurve === 'X25519' ? { name: 'X25519' } : { name: 'ECDH', namedCurve };
            }
            catch (cause) {
                throw new JOSENotSupported('Invalid or unsupported key format');
            }
            keyUsages = isPublic ? [] : ['deriveBits'];
            break;
        }
        case 'Ed25519':
        case 'EdDSA':
            algorithm = { name: 'Ed25519' };
            keyUsages = getSigUsages();
            break;
        case 'ML-DSA-44':
        case 'ML-DSA-65':
        case 'ML-DSA-87':
            algorithm = { name: alg };
            keyUsages = getSigUsages();
            break;
        default:
            throw new JOSENotSupported('Invalid or unsupported "alg" (Algorithm) value');
    }
    return crypto.subtle.importKey(keyFormat, keyData, algorithm, options?.extractable ?? (isPublic ? true : false), keyUsages);
};
const processPEMData = (pem, pattern) => {
    return decodeBase64(pem.replace(pattern, ''));
};
export const fromPKCS8 = (pem, alg, options) => {
    const keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g);
    let opts = options;
    if (alg?.startsWith?.('ECDH-ES')) {
        opts ||= {};
        opts.getNamedCurve = (keyData) => {
            const state = createASN1State(keyData);
            parsePKCS8Header(state);
            return parseECAlgorithmIdentifier(state);
        };
    }
    return genericImport('pkcs8', keyData, alg, opts);
};
export const fromSPKI = (pem, alg, options) => {
    const keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PUBLIC KEY-----|\s)/g);
    let opts = options;
    if (alg?.startsWith?.('ECDH-ES')) {
        opts ||= {};
        opts.getNamedCurve = (keyData) => {
            const state = createASN1State(keyData);
            parseSPKIHeader(state);
            return parseECAlgorithmIdentifier(state);
        };
    }
    return genericImport('spki', keyData, alg, opts);
};
function spkiFromX509(buf) {
    const state = createASN1State(buf);
    expectTag(state, 0x30, 'Invalid certificate structure');
    parseLength(state);
    expectTag(state, 0x30, 'Invalid tbsCertificate structure');
    parseLength(state);
    if (buf[state.pos] === 0xa0) {
        skipElement(state, 6);
    }
    else {
        skipElement(state, 5);
    }
    const spkiStart = state.pos;
    expectTag(state, 0x30, 'Invalid SPKI structure');
    const spkiContentLen = parseLength(state);
    return buf.subarray(spkiStart, spkiStart + spkiContentLen + (state.pos - spkiStart));
}
function extractX509SPKI(x509) {
    const derBytes = processPEMData(x509, /(?:-----(?:BEGIN|END) CERTIFICATE-----|\s)/g);
    return spkiFromX509(derBytes);
}
export const fromX509 = (pem, alg, options) => {
    let spki;
    try {
        spki = extractX509SPKI(pem);
    }
    catch (cause) {
        throw new TypeError('Failed to parse the X.509 certificate', { cause });
    }
    return fromSPKI(formatPEM(encodeBase64(spki), 'PUBLIC KEY'), alg, options);
};
