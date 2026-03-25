import { JWEInvalid } from '../util/errors.js';
import { bitLength } from './iv.js';
export default (enc, iv) => {
    if (iv.length << 3 !== bitLength(enc)) {
        throw new JWEInvalid('Invalid Initialization Vector length');
    }
};
