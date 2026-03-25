import subtleAlgorithm from './subtle_dsa.js';
import crypto from './webcrypto.js';
import checkKeyLength from './check_key_length.js';
import getVerifyKey from './get_sign_verify_key.js';
const verify = async (alg, key, signature, data) => {
    const cryptoKey = await getVerifyKey(alg, key, 'verify');
    checkKeyLength(alg, cryptoKey);
    const algorithm = subtleAlgorithm(alg, cryptoKey.algorithm);
    try {
        return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
    }
    catch (_a) {
        return false;
    }
};
export default verify;
