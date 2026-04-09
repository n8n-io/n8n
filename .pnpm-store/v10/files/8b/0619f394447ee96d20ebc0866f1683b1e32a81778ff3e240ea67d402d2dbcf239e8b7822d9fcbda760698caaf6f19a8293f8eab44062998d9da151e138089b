/* eslint-disable @typescript-eslint/no-unused-expressions */
/**
 * Grows a buffer if it isn't large enough
 * @returns The original buffer if resized successfully, or a newly created buffer
 */
export function extendBuffer(buffer, newByteLength) {
    if (buffer.byteLength >= newByteLength)
        return buffer;
    if (ArrayBuffer.isView(buffer)) {
        const newBuffer = extendBuffer(buffer.buffer, newByteLength);
        return new buffer.constructor(newBuffer, buffer.byteOffset, newByteLength);
    }
    const isShared = typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer;
    // Note: If true, the buffer must be resizable/growable because of the first check.
    if (buffer.maxByteLength > newByteLength) {
        isShared ? buffer.grow(newByteLength) : buffer.resize(newByteLength);
        return buffer;
    }
    if (isShared) {
        const newBuffer = new SharedArrayBuffer(newByteLength);
        new Uint8Array(newBuffer).set(new Uint8Array(buffer));
        return newBuffer;
    }
    try {
        return buffer.transfer(newByteLength);
    }
    catch {
        const newBuffer = new ArrayBuffer(newByteLength);
        new Uint8Array(newBuffer).set(new Uint8Array(buffer));
        return newBuffer;
    }
}
export function toUint8Array(buffer) {
    if (buffer instanceof Uint8Array)
        return buffer;
    if (!ArrayBuffer.isView(buffer))
        return new Uint8Array(buffer);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
