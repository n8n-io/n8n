export function capitalize(value) {
    return (value.at(0).toUpperCase() + value.slice(1));
}
export function uncapitalize(value) {
    return (value.at(0).toLowerCase() + value.slice(1));
}
const encoder = new TextEncoder();
/**
 * Encodes a UTF-8 string into a buffer
 */
export function encodeUTF8(input) {
    return encoder.encode(input);
}
const decoder = new TextDecoder();
/**
 * Decodes a UTF-8 string from a buffer
 */
export function decodeUTF8(input) {
    if (!input)
        return '';
    if (input.buffer instanceof ArrayBuffer && !input.buffer.resizable)
        return decoder.decode(input);
    const buffer = new Uint8Array(input.byteLength);
    buffer.set(input);
    return decoder.decode(buffer);
}
export function encodeASCII(input) {
    const data = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
        data[i] = input.charCodeAt(i);
    }
    return data;
}
export function decodeASCII(input) {
    let output = '';
    for (let i = 0; i < input.length; i++) {
        output += String.fromCharCode(input[i]);
    }
    return output;
}
