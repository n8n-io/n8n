import type { SerializedBuffer } from '../serialized-buffer';
import { toBuffer, isSerializedBuffer, serializeBuffer } from '../serialized-buffer';

// Mock data for tests
const validSerializedBuffer: SerializedBuffer = {
	type: 'Buffer',
	data: [65, 66, 67], // Corresponds to 'ABC' in ASCII
};

describe('toBuffer', () => {
	it('should convert a SerializedBuffer to a Buffer', () => {
		const buffer = toBuffer(validSerializedBuffer);
		expect(buffer).toBeInstanceOf(Buffer);
		expect(buffer.toString()).toBe('ABC');
	});

	it('should serialize stringified buffer to the same buffer', () => {
		const serializedBuffer = JSON.stringify(Buffer.from('n8n on the rocks'));
		const buffer = toBuffer(JSON.parse(serializedBuffer));
		expect(buffer).toBeInstanceOf(Buffer);
		expect(buffer.toString()).toBe('n8n on the rocks');
	});
});

describe('serializeBuffer', () => {
	test.each([
		['empty', Buffer.alloc(0)],
		['text', Buffer.from('n8n on the rocks')],
		['non-UTF-8 bytes', Buffer.from([0, 255, 128, 0xc3, 0x28, 10])],
	])('should round-trip a %s buffer through JSON', (_, buffer) => {
		const json = JSON.stringify(serializeBuffer(buffer));
		const parsed: unknown = JSON.parse(json);

		expect(isSerializedBuffer(parsed)).toBe(true);
		expect(toBuffer(parsed as SerializedBuffer).equals(buffer)).toBe(true);
	});

	it('should encode as base64', () => {
		expect(serializeBuffer(Buffer.from('ABC'))).toEqual({ type: 'Buffer', base64: 'QUJD' });
	});
});

describe('toBuffer with mixed representations', () => {
	it('should decode the byte array when base64 is not the only payload', () => {
		const candidate: unknown = { type: 'Buffer', data: [65], base64: 'QkJC' };

		expect(isSerializedBuffer(candidate)).toBe(true);
		expect(toBuffer(candidate as SerializedBuffer).toString()).toBe('A');
	});

	it('should decode the byte array when base64 is not a string', () => {
		const candidate: unknown = { type: 'Buffer', data: [65], base64: null };

		expect(isSerializedBuffer(candidate)).toBe(true);
		expect(toBuffer(candidate as SerializedBuffer).toString()).toBe('A');
	});
});

describe('toBuffer with an invalid input', () => {
	it('should throw when neither base64 nor data is usable', () => {
		const candidate: unknown = { type: 'Buffer', base64: null, data: 'notAnArray' };

		expect(() => toBuffer(candidate as SerializedBuffer)).toThrow('Invalid serialized buffer');
	});
});

describe('isSerializedBuffer', () => {
	it('should return true for a valid SerializedBuffer', () => {
		expect(isSerializedBuffer(validSerializedBuffer)).toBe(true);
	});

	it('should return true for a base64 SerializedBuffer', () => {
		expect(isSerializedBuffer({ type: 'Buffer', base64: 'QUJD' })).toBe(true);
	});

	test.each([
		[{ data: [1, 2, 3] }],
		[{ data: [1, 2, 256] }],
		[{ type: 'Buffer', data: 'notAnArray' }],
		[{ type: 'Buffer', base64: 42 }],
		[{ type: 'NotBuffer', base64: 'QUJD' }],
		[{ type: 'Buffer', base64: 'QUJD', name: 'not a buffer' }],
		[{ data: 42 }],
		[{ data: 'test' }],
		[{ data: true }],
		[null],
		[undefined],
		[42],
		[{}],
	])('should return false for %s', (value) => {
		expect(isSerializedBuffer(value)).toBe(false);
	});
});

describe('Integration: toBuffer and isSerializedBuffer', () => {
	it('should correctly validate and convert a SerializedBuffer', () => {
		if (isSerializedBuffer(validSerializedBuffer)) {
			const buffer = toBuffer(validSerializedBuffer);
			expect(buffer.toString()).toBe('ABC');
		} else {
			expect.fail('Expected validSerializedBuffer to be a SerializedBuffer');
		}
	});
});
