import { Buffer } from 'buffer';
import { decoder } from '../lib/buffer_utils.js';
let encode;
function normalize(input) {
    let encoded = input;
    if (encoded instanceof Uint8Array) {
        encoded = decoder.decode(encoded);
    }
    return encoded;
}
if (Buffer.isEncoding('base64url')) {
    encode = (input) => Buffer.from(input).toString('base64url');
}
else {
    encode = (input) => Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
export const decodeBase64 = (input) => Buffer.from(input, 'base64');
export const encodeBase64 = (input) => Buffer.from(input).toString('base64');
export { encode };
export const decode = (input) => Buffer.from(normalize(input), 'base64');
