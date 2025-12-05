/**
 * Type-safe buffer reading and writing utilities for RFB protocol.
 * These classes provide a fluent API for encoding/decoding RFB messages
 * without using type casts.
 */

/**
 * Type-safe buffer reader for parsing RFB protocol messages.
 * Tracks position and provides bounds-checked reads.
 */
export class RfbReader {
	private offset = 0;

	constructor(private readonly buffer: Buffer) {}

	/**
	 * Read an unsigned 8-bit integer
	 */
	readUInt8(): number {
		this.ensureAvailable(1);
		const value = this.buffer.readUInt8(this.offset);
		this.offset += 1;
		return value;
	}

	/**
	 * Read an unsigned 16-bit integer (big-endian)
	 */
	readUInt16BE(): number {
		this.ensureAvailable(2);
		const value = this.buffer.readUInt16BE(this.offset);
		this.offset += 2;
		return value;
	}

	/**
	 * Read an unsigned 32-bit integer (big-endian)
	 */
	readUInt32BE(): number {
		this.ensureAvailable(4);
		const value = this.buffer.readUInt32BE(this.offset);
		this.offset += 4;
		return value;
	}

	/**
	 * Read a signed 32-bit integer (big-endian)
	 */
	readInt32BE(): number {
		this.ensureAvailable(4);
		const value = this.buffer.readInt32BE(this.offset);
		this.offset += 4;
		return value;
	}

	/**
	 * Read a specified number of bytes as a Buffer
	 */
	readBytes(length: number): Buffer {
		this.ensureAvailable(length);
		const slice = this.buffer.subarray(this.offset, this.offset + length);
		this.offset += length;
		return slice;
	}

	/**
	 * Read a specified number of bytes as a Uint8Array
	 */
	readUint8Array(length: number): Uint8Array {
		this.ensureAvailable(length);
		const slice = new Uint8Array(this.buffer.buffer, this.buffer.byteOffset + this.offset, length);
		this.offset += length;
		// Return a copy to avoid issues with buffer reuse
		return new Uint8Array(slice);
	}

	/**
	 * Read a string of specified length (UTF-8)
	 */
	readString(length: number): string {
		return this.readBytes(length).toString('utf8');
	}

	/**
	 * Read a string of specified length (ASCII)
	 */
	readAsciiString(length: number): string {
		return this.readBytes(length).toString('ascii');
	}

	/**
	 * Skip a specified number of bytes
	 */
	skip(bytes: number): void {
		this.ensureAvailable(bytes);
		this.offset += bytes;
	}

	/**
	 * Get current read position
	 */
	get position(): number {
		return this.offset;
	}

	/**
	 * Get number of remaining bytes
	 */
	get remaining(): number {
		return this.buffer.length - this.offset;
	}

	/**
	 * Check if enough bytes are available
	 */
	hasAvailable(bytes: number): boolean {
		return this.remaining >= bytes;
	}

	/**
	 * Reset position to beginning
	 */
	reset(): void {
		this.offset = 0;
	}

	/**
	 * Set position to specific offset
	 */
	seek(position: number): void {
		if (position < 0 || position > this.buffer.length) {
			throw new RangeError(`Seek position ${position} out of bounds [0, ${this.buffer.length}]`);
		}
		this.offset = position;
	}

	/**
	 * Ensure enough bytes are available for reading
	 */
	private ensureAvailable(bytes: number): void {
		if (this.remaining < bytes) {
			throw new RangeError(
				`Not enough data: need ${bytes} bytes but only ${this.remaining} available`,
			);
		}
	}
}

/**
 * Type-safe buffer writer for constructing RFB protocol messages.
 * Uses a fluent API and collects chunks for efficient concatenation.
 */
export class RfbWriter {
	private chunks: Buffer[] = [];

	/**
	 * Write an unsigned 8-bit integer
	 */
	writeUInt8(value: number): this {
		const buf = Buffer.allocUnsafe(1);
		buf.writeUInt8(value & 0xff);
		this.chunks.push(buf);
		return this;
	}

	/**
	 * Write an unsigned 16-bit integer (big-endian)
	 */
	writeUInt16BE(value: number): this {
		const buf = Buffer.allocUnsafe(2);
		buf.writeUInt16BE(value & 0xffff);
		this.chunks.push(buf);
		return this;
	}

	/**
	 * Write an unsigned 32-bit integer (big-endian)
	 */
	writeUInt32BE(value: number): this {
		const buf = Buffer.allocUnsafe(4);
		buf.writeUInt32BE(value >>> 0);
		this.chunks.push(buf);
		return this;
	}

	/**
	 * Write a signed 32-bit integer (big-endian)
	 */
	writeInt32BE(value: number): this {
		const buf = Buffer.allocUnsafe(4);
		buf.writeInt32BE(value);
		this.chunks.push(buf);
		return this;
	}

	/**
	 * Write raw bytes from Buffer or Uint8Array
	 */
	writeBytes(data: Buffer | Uint8Array): this {
		this.chunks.push(Buffer.from(data));
		return this;
	}

	/**
	 * Write an ASCII string
	 */
	writeAsciiString(str: string): this {
		this.chunks.push(Buffer.from(str, 'ascii'));
		return this;
	}

	/**
	 * Write a UTF-8 string
	 */
	writeUtf8String(str: string): this {
		this.chunks.push(Buffer.from(str, 'utf8'));
		return this;
	}

	/**
	 * Write padding bytes (zeros)
	 */
	writePadding(bytes: number): this {
		this.chunks.push(Buffer.alloc(bytes));
		return this;
	}

	/**
	 * Get the total length of all written data
	 */
	get length(): number {
		return this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	}

	/**
	 * Concatenate all chunks into a single Buffer
	 */
	toBuffer(): Buffer {
		return Buffer.concat(this.chunks);
	}

	/**
	 * Clear all written data
	 */
	clear(): this {
		this.chunks = [];
		return this;
	}
}
