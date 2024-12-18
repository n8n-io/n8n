/** A nodejs Buffer gone through JSON.stringify */
export type SerializedBuffer = {
	type: 'Buffer';
	data: number[]; // Uint8Array
};

/** Converts the given SerializedBuffer to nodejs Buffer */
export function toBuffer(serializedBuffer: SerializedBuffer): Buffer {
	return Buffer.from(serializedBuffer.data);
}

function isNonNullableObject(data: unknown): data is object {
	return data !== null && typeof data === 'object';
}

export function isSerializedBuffer(maybeBuffer: unknown): maybeBuffer is SerializedBuffer {
	return (
		isNonNullableObject(maybeBuffer) &&
		'type' in maybeBuffer &&
		'data' in maybeBuffer &&
		maybeBuffer.type === 'Buffer' &&
		Array.isArray(maybeBuffer.data)
	);
}
