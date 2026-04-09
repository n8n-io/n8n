import { capitalize } from '../string.js';
export const typeNames = [
    'int8',
    'uint8',
    'int16',
    'uint16',
    'int32',
    'uint32',
    'int64',
    'uint64',
    'int128',
    'uint128',
    'float32',
    'float64',
    'float128',
];
export const validNames = [...typeNames, ...typeNames.map(t => capitalize(t)), 'char'];
export const regex = /^(u?int|float)(8|16|32|64|128)$/i;
export function normalize(type) {
    return (type == 'char' ? 'uint8' : type.toLowerCase());
}
export function isType(type) {
    return regex.test(type.toString());
}
export function isValid(type) {
    return type == 'char' || regex.test(type.toString().toLowerCase());
}
export function checkValid(type) {
    if (!isValid(type)) {
        throw new TypeError('Not a valid primitive type: ' + type);
    }
}
export const mask64 = BigInt('0xffffffffffffffff');
