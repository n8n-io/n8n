import { JOSENotSupported, JWEInvalid } from '../util/errors.js';
import { concat } from './buffer_utils.js';
function supported(name) {
    if (typeof globalThis[name] === 'undefined') {
        throw new JOSENotSupported(`JWE "zip" (Compression Algorithm) Header Parameter requires the ${name} API.`);
    }
}
export async function compress(input) {
    supported('CompressionStream');
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(input).catch(() => { });
    writer.close().catch(() => { });
    const chunks = [];
    const reader = cs.readable.getReader();
    for (;;) {
        const { value, done } = await reader.read();
        if (done)
            break;
        chunks.push(value);
    }
    return concat(...chunks);
}
export async function decompress(input, maxLength) {
    supported('DecompressionStream');
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(input).catch(() => { });
    writer.close().catch(() => { });
    const chunks = [];
    let length = 0;
    const reader = ds.readable.getReader();
    for (;;) {
        const { value, done } = await reader.read();
        if (done)
            break;
        chunks.push(value);
        length += value.byteLength;
        if (maxLength !== Infinity && length > maxLength) {
            throw new JWEInvalid('Decompressed plaintext exceeded the configured limit');
        }
    }
    return concat(...chunks);
}
