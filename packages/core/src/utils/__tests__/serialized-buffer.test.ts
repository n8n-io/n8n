import type { SerializedBuffer } from '../serialized-buffer';
import { toBuffer, isSerializedBuffer } from '../serialized-buffer';

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

describe('isSerializedBuffer', () => {
	it('should return true for a valid SerializedBuffer', () => {
		expect(isSerializedBuffer(validSerializedBuffer)).toBe(true);
	});

	test.each([
		[{ data: [1, 2, 3] }],
		[{ data: [1, 2, 256] }],
		[{ type: 'Buffer', data: 'notAnArray' }],
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
			fail('Expected validSerializedBuffer to be a SerializedBuffer');
		}
	});
});
