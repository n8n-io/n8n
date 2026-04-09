/** Utilities for computing checksums */
// Precompute CRC32C table
const crc32cTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let value = i;
    for (let j = 0; j < 8; j++) {
        value = value & 1 ? 0x82f63b78 ^ (value >>> 1) : value >>> 1;
    }
    crc32cTable[i] = value;
}
/**
 * Computes the CRC32C checksum of a Uint8Array.
 */
export function crc32c(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ crc32cTable[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}
