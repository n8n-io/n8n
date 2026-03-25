import { createHmac } from 'crypto';
import { concat, uint64be } from '../lib/buffer_utils.js';
export default function cbcTag(aad, iv, ciphertext, macSize, macKey, keySize) {
    const macData = concat(aad, iv, ciphertext, uint64be(aad.length << 3));
    const hmac = createHmac(`sha${macSize}`, macKey);
    hmac.update(macData);
    return hmac.digest().slice(0, keySize >> 3);
}
