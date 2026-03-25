import { JWEInvalid } from '../util/errors.js';
import { bitLength } from './iv.js';
const checkIvLength = (enc, iv) => {
    if (iv.length << 3 !== bitLength(enc)) {
        throw new JWEInvalid('Invalid Initialization Vector length');
    }
};
export default checkIvLength;
