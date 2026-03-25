export function assertCryptoKey(key) {
    if (!isCryptoKey(key)) {
        throw new Error('CryptoKey instance expected');
    }
}
export const isCryptoKey = (key) => {
    if (key?.[Symbol.toStringTag] === 'CryptoKey')
        return true;
    try {
        return key instanceof CryptoKey;
    }
    catch {
        return false;
    }
};
export const isKeyObject = (key) => key?.[Symbol.toStringTag] === 'KeyObject';
export const isKeyLike = (key) => isCryptoKey(key) || isKeyObject(key);
