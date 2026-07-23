import { makeSerializable } from '../serializable-error';

describe('makeSerializable', () => {
	it('should copy primitive properties and preserve them through JSON serialization', () => {
		const err = new Error('Test Error') as Error & Record<string, unknown>;
		err.code = '23505';
		err.detail = 'Key already exists';
		err.massiveBuffer = Buffer.alloc(10);
		err.nested = { x: 1 };
		Object.defineProperty(err, 'unconfigurable', {
			value: 'boom',
			configurable: false,
			enumerable: true,
		});

		const safeErr = makeSerializable(err);

		// Crucial Change: Simulate the IPC wire transport!
		const serialized = JSON.parse(JSON.stringify(safeErr));

		expect(serialized.message).toBe('Test Error');
		expect(serialized.name).toBe('Error');
		expect(serialized.stack).toBeDefined(); // This explicitly proves the stack ghost is fixed!

		// Custom primitive properties should be preserved
		expect(serialized.code).toBe('23505');
		expect(serialized.detail).toBe('Key already exists');
		expect(serialized.unconfigurable).toBe('boom');

		// Complex objects and buffers should be stripped
		expect(serialized.massiveBuffer).toBeUndefined();
		expect(serialized.nested).toBeUndefined();
	});
});
