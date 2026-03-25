import { getCiphers } from 'crypto';
let ciphers;
export default (algorithm) => {
    ciphers || (ciphers = new Set(getCiphers()));
    return ciphers.has(algorithm);
};
