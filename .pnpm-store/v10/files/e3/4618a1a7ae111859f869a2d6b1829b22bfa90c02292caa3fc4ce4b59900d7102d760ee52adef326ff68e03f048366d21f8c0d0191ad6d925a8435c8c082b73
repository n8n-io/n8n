/* eslint-disable @typescript-eslint/no-unused-expressions */

/**
 * A generic ArrayBufferView (typed array) constructor
 */
export interface ArrayBufferViewConstructor {
	readonly prototype: ArrayBufferView<ArrayBufferLike>;
	new (length: number): ArrayBufferView<ArrayBuffer>;
	new (array: ArrayLike<number>): ArrayBufferView<ArrayBuffer>;
	new <TArrayBuffer extends ArrayBufferLike = ArrayBuffer>(
		buffer: TArrayBuffer,
		byteOffset?: number,
		length?: number
	): ArrayBufferView<TArrayBuffer>;
	new (array: ArrayLike<number> | ArrayBuffer): ArrayBufferView<ArrayBuffer>;
}

/**
 * Grows a buffer if it isn't large enough
 * @returns The original buffer if resized successfully, or a newly created buffer
 */
export function extendBuffer<T extends ArrayBufferLike | ArrayBufferView>(buffer: T, newByteLength: number): T {
	if (buffer.byteLength >= newByteLength) return buffer;

	if (ArrayBuffer.isView(buffer)) {
		const newBuffer = extendBuffer(buffer.buffer, newByteLength);
		return new (buffer.constructor as ArrayBufferViewConstructor)(newBuffer, buffer.byteOffset, newByteLength) as T;
	}

	const isShared = typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer;

	// Note: If true, the buffer must be resizable/growable because of the first check.
	if (buffer.maxByteLength > newByteLength) {
		isShared ? buffer.grow(newByteLength) : (buffer as ArrayBuffer).resize(newByteLength);
		return buffer;
	}

	if (isShared) {
		const newBuffer = new SharedArrayBuffer(newByteLength) as T & SharedArrayBuffer;
		new Uint8Array(newBuffer).set(new Uint8Array(buffer));
		return newBuffer;
	}

	try {
		return (buffer as ArrayBuffer).transfer(newByteLength) as T;
	} catch {
		const newBuffer = new ArrayBuffer(newByteLength) as T & ArrayBuffer;
		new Uint8Array(newBuffer).set(new Uint8Array(buffer));
		return newBuffer;
	}
}

export function toUint8Array(buffer: ArrayBufferLike | ArrayBufferView): Uint8Array {
	if (buffer instanceof Uint8Array) return buffer;
	if (!ArrayBuffer.isView(buffer)) return new Uint8Array(buffer);
	return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
