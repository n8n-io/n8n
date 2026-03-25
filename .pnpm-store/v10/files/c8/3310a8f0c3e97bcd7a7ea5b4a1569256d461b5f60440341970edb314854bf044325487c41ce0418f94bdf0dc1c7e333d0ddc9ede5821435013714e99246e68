import webcrypto, { isCryptoKey } from './webcrypto.js';
import isKeyObject from './is_key_object.js';
export default (key) => isKeyObject(key) || isCryptoKey(key);
const types = ['KeyObject'];
if (globalThis.CryptoKey || (webcrypto === null || webcrypto === void 0 ? void 0 : webcrypto.CryptoKey)) {
    types.push('CryptoKey');
}
export { types };
