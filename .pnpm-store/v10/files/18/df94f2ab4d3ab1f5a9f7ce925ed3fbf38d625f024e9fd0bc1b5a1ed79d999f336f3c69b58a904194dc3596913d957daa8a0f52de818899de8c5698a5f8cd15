import isObject from './is_object.js';
export function isJWK(key) {
    return isObject(key) && typeof key.kty === 'string';
}
export function isPrivateJWK(key) {
    return key.kty !== 'oct' && typeof key.d === 'string';
}
export function isPublicJWK(key) {
    return key.kty !== 'oct' && typeof key.d === 'undefined';
}
export function isSecretJWK(key) {
    return key.kty === 'oct' && typeof key.k === 'string';
}
