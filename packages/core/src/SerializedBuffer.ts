/** A nodejs Buffer gone through JSON.stringify */
export type SerializedBuffer = {
	type: 'Buffer';
	data: number[]; // Array like Uint8Array, each item is uint8 (0-255)
};

/** Converts the given SerializedBuffer to nodejs Buffer */
export function toBuffer(serializedBuffer: SerializedBuffer): Buffer {
	return Buffer.from(serializedBuffer.data);
}

function isObjectLiteral(item: unknown): item is { [key: string]: unknown } {
	return typeof item === 'object' && item !== null && !Array.isArray(item);
}

export function isSerializedBuffer(candidate: unknown): candidate is SerializedBuffer {
	return (
		isObjectLiteral(candidate) &&
		'type' in candidate &&
		'data' in candidate &&
		candidate.type === 'Buffer' &&
		Array.isArray(candidate.data)
	);
}
