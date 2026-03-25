import { isObject } from './is_object.js';
export const isJWK = (key) => isObject(key) && typeof key.kty === 'string';
export const isPrivateJWK = (key) => key.kty !== 'oct' &&
    ((key.kty === 'AKP' && typeof key.priv === 'string') || typeof key.d === 'string');
export const isPublicJWK = (key) => key.kty !== 'oct' && key.d === undefined && key.priv === undefined;
export const isSecretJWK = (key) => key.kty === 'oct' && typeof key.k === 'string';
