import { isObjectLiteral } from '@n8n/backend-common';
import { UnexpectedError } from 'n8n-workflow';

/** A nodejs Buffer gone through JSON.stringify */
type ByteArrayBuffer = {
	type: 'Buffer';
	data: number[]; // Array like Uint8Array, each item is uint8 (0-255)
};

/** A nodejs Buffer encoded as base64, compact enough to cross JSON transports when large */
type Base64Buffer = {
	type: 'Buffer';
	base64: string;
};

export type SerializedBuffer = ByteArrayBuffer | Base64Buffer;

/** Converts the given nodejs Buffer to a SerializedBuffer that survives JSON.stringify */
export function serializeBuffer(buffer: Buffer): Base64Buffer {
	return { type: 'Buffer', base64: buffer.toString('base64') };
}

/** Converts the given SerializedBuffer to nodejs Buffer */
export function toBuffer(serializedBuffer: SerializedBuffer): Buffer {
	if ('base64' in serializedBuffer && typeof serializedBuffer.base64 === 'string') {
		return Buffer.from(serializedBuffer.base64, 'base64');
	}

	if ('data' in serializedBuffer && Array.isArray(serializedBuffer.data)) {
		return Buffer.from(serializedBuffer.data);
	}

	throw new UnexpectedError('Invalid serialized buffer');
}

export function isSerializedBuffer(candidate: unknown): candidate is SerializedBuffer {
	if (!isObjectLiteral(candidate) || !('type' in candidate) || candidate.type !== 'Buffer') {
		return false;
	}

	return (
		('data' in candidate && Array.isArray(candidate.data)) ||
		('base64' in candidate && typeof candidate.base64 === 'string')
	);
}
