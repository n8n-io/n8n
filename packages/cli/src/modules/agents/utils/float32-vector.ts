import type { ValueTransformer } from '@n8n/typeorm';

const BYTES_PER_FLOAT = Float32Array.BYTES_PER_ELEMENT;

/**
 * Stores a float32 vector as its bytes. That is a fifth of the size of JSON text,
 * needs no parsing, and is the format that sqlite-vec reads. The byte order is
 * the platform's, which is little-endian on every platform n8n supports.
 */
export const float32VectorTransformer: ValueTransformer = {
	to: (vector: Float32Array | null | undefined): Buffer | null | undefined => {
		if (!vector) return vector;
		return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
	},
	from: (bytes: Buffer | null): Float32Array | null => {
		if (!bytes || bytes.length % BYTES_PER_FLOAT !== 0) return null;
		// Copy, because a Buffer can share an unaligned pool that a Float32Array cannot view.
		return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
	},
};
