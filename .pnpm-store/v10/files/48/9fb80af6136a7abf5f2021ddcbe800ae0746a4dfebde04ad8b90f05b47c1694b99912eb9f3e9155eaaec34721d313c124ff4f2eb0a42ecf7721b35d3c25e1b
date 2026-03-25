// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @internal
 * Encodes a length of a packet in DER format
 */
function encodeLength(length) {
    if (length <= 127) {
        return Uint8Array.of(length);
    }
    else if (length < 256) {
        return Uint8Array.of(0x81, length);
    }
    else if (length < 65536) {
        return Uint8Array.of(0x82, length >> 8, length & 0xff);
    }
    else {
        throw new Error("Unsupported length to encode");
    }
}
/**
 * @internal
 * Encodes a buffer for DER, as sets the id to the given id
 */
function encodeBuffer(buffer, bufferId) {
    if (buffer.length === 0) {
        return buffer;
    }
    let result = new Uint8Array(buffer);
    // If the high bit is set, prepend a 0
    if (result[0] & 0x80) {
        const array = new Uint8Array(result.length + 1);
        array[0] = 0;
        array.set(result, 1);
        result = array;
    }
    // Prepend the DER header for this buffer
    const encodedLength = encodeLength(result.length);
    const totalLength = 1 + encodedLength.length + result.length;
    const outputBuffer = new Uint8Array(totalLength);
    outputBuffer[0] = bufferId;
    outputBuffer.set(encodedLength, 1);
    outputBuffer.set(result, 1 + encodedLength.length);
    return outputBuffer;
}
function makeSequence(encodedParts) {
    const totalLength = encodedParts.reduce((sum, part) => sum + part.length, 0);
    const sequence = new Uint8Array(totalLength);
    for (let i = 0; i < encodedParts.length; i++) {
        const previousLength = i > 0 ? encodedParts[i - 1].length : 0;
        sequence.set(encodedParts[i], previousLength);
    }
    const full_encoded = encodeBuffer(sequence, 0x30); // SEQUENCE
    return Buffer.from(full_encoded).toString("base64");
}
/**
 * Fill in the PEM with 64 character lines as per RFC:
 *
 * "To represent the encapsulated text of a PEM message, the encoding
 * function's output is delimited into text lines (using local
 * conventions), with each line except the last containing exactly 64
 * printable characters and the final line containing 64 or fewer
 * printable characters."
 */
function formatBase64Sequence(base64Sequence) {
    const lines = base64Sequence.match(/.{1,64}/g);
    let result = "";
    if (lines) {
        for (const line of lines) {
            result += line;
            result += "\n";
        }
    }
    else {
        throw new Error("Could not create correct PEM");
    }
    return result;
}
/**
 * @internal
 * Encode a JWK to PEM format. To do so, it internally repackages the JWK as a DER
 * that is then encoded as a PEM.
 */
export function convertJWKtoPEM(key) {
    let result = "";
    if (key.n && key.e) {
        const parts = [key.n, key.e];
        const encodedParts = parts.map((part) => encodeBuffer(part, 0x2)); // INTEGER
        const base64Sequence = makeSequence(encodedParts);
        result += "-----BEGIN RSA PUBLIC KEY-----\n";
        result += formatBase64Sequence(base64Sequence);
        result += "-----END RSA PUBLIC KEY-----\n";
    }
    if (!result.length) {
        throw new Error("Unsupported key format for local operations");
    }
    return result.slice(0, -1); // Removing the last new line
}
//# sourceMappingURL=conversions.js.map