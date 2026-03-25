import { encode, concat, uint32be } from './buffer_utils.js';
import { checkEncCryptoKey } from './crypto_key.js';
import { digest } from './digest.js';
function lengthAndInput(input) {
    return concat(uint32be(input.length), input);
}
async function concatKdf(Z, L, OtherInfo) {
    const dkLen = L >> 3;
    const hashLen = 32;
    const reps = Math.ceil(dkLen / hashLen);
    const dk = new Uint8Array(reps * hashLen);
    for (let i = 1; i <= reps; i++) {
        const hashInput = new Uint8Array(4 + Z.length + OtherInfo.length);
        hashInput.set(uint32be(i), 0);
        hashInput.set(Z, 4);
        hashInput.set(OtherInfo, 4 + Z.length);
        const hashResult = await digest('sha256', hashInput);
        dk.set(hashResult, (i - 1) * hashLen);
    }
    return dk.slice(0, dkLen);
}
export async function deriveKey(publicKey, privateKey, algorithm, keyLength, apu = new Uint8Array(), apv = new Uint8Array()) {
    checkEncCryptoKey(publicKey, 'ECDH');
    checkEncCryptoKey(privateKey, 'ECDH', 'deriveBits');
    const algorithmID = lengthAndInput(encode(algorithm));
    const partyUInfo = lengthAndInput(apu);
    const partyVInfo = lengthAndInput(apv);
    const suppPubInfo = uint32be(keyLength);
    const suppPrivInfo = new Uint8Array();
    const otherInfo = concat(algorithmID, partyUInfo, partyVInfo, suppPubInfo, suppPrivInfo);
    const Z = new Uint8Array(await crypto.subtle.deriveBits({
        name: publicKey.algorithm.name,
        public: publicKey,
    }, privateKey, getEcdhBitLength(publicKey)));
    return concatKdf(Z, keyLength, otherInfo);
}
function getEcdhBitLength(publicKey) {
    if (publicKey.algorithm.name === 'X25519') {
        return 256;
    }
    return (Math.ceil(parseInt(publicKey.algorithm.namedCurve.slice(-3), 10) / 8) << 3);
}
export function allowed(key) {
    switch (key.algorithm.namedCurve) {
        case 'P-256':
        case 'P-384':
        case 'P-521':
            return true;
        default:
            return key.algorithm.name === 'X25519';
    }
}
