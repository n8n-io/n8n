import { decode as b64u } from './base64url.js';
import { decoder } from '../lib/buffer_utils.js';
import isObject from '../lib/is_object.js';
import { JWTInvalid } from './errors.js';
export function decodeJwt(jwt) {
    if (typeof jwt !== 'string')
        throw new JWTInvalid('JWTs must use Compact JWS serialization, JWT must be a string');
    const { 1: payload, length } = jwt.split('.');
    if (length === 5)
        throw new JWTInvalid('Only JWTs using Compact JWS serialization can be decoded');
    if (length !== 3)
        throw new JWTInvalid('Invalid JWT');
    if (!payload)
        throw new JWTInvalid('JWTs must contain a payload');
    let decoded;
    try {
        decoded = b64u(payload);
    }
    catch {
        throw new JWTInvalid('Failed to base64url decode the payload');
    }
    let result;
    try {
        result = JSON.parse(decoder.decode(decoded));
    }
    catch {
        throw new JWTInvalid('Failed to parse the decoded payload as JSON');
    }
    if (!isObject(result))
        throw new JWTInvalid('Invalid JWT Claims Set');
    return result;
}
