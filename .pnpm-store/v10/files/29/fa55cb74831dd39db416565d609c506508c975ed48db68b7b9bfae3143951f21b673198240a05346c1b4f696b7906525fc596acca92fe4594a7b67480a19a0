export function assertCryptoKey(key) {
    if (!isCryptoKey(key)) {
        throw new Error('CryptoKey instance expected');
    }
}
export function isCryptoKey(key) {
    return key?.[Symbol.toStringTag] === 'CryptoKey';
}
export function isKeyObject(key) {
    return key?.[Symbol.toStringTag] === 'KeyObject';
}
export default (key) => {
    return isCryptoKey(key) || isKeyObject(key);
};
