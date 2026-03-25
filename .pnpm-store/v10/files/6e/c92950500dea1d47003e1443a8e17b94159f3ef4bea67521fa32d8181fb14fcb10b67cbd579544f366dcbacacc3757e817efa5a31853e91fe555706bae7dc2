import crypto from './webcrypto.js';
const digest = async (algorithm, data) => {
    const subtleDigest = `SHA-${algorithm.slice(-3)}`;
    return new Uint8Array(await crypto.subtle.digest(subtleDigest, data));
};
export default digest;
