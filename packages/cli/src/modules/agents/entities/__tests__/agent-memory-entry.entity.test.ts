import { float32VectorTransformer } from '../agent-memory-entry.entity';

describe('float32VectorTransformer', () => {
	it('stores four little-endian bytes per value and reads them back', () => {
		const bytes = float32VectorTransformer.to(new Float32Array([0.5, -2])) as Buffer;

		expect(bytes).toEqual(Buffer.from([0, 0, 0, 63, 0, 0, 0, 192]));
		expect(float32VectorTransformer.from(bytes)).toEqual(new Float32Array([0.5, -2]));
	});

	it('rounds values to float32 precision', () => {
		const vector = float32VectorTransformer.from(
			float32VectorTransformer.to(new Float32Array([0.1])),
		) as Float32Array;

		expect(vector[0]).toBe(Math.fround(0.1));
	});

	it('writes only the bytes of a subarray view', () => {
		const view = new Float32Array([1, 0.5, -2, 3]).subarray(1, 3);

		const bytes = float32VectorTransformer.to(view) as Buffer;

		expect(float32VectorTransformer.from(Buffer.from(bytes))).toEqual(new Float32Array([0.5, -2]));
	});

	it('reads an unaligned Buffer into an independent copy', () => {
		const source = Buffer.concat([Buffer.from([9]), Buffer.from([0, 0, 0, 63, 0, 0, 0, 192])]);
		const unaligned = source.subarray(1);

		const vector = float32VectorTransformer.from(unaligned) as Float32Array;
		source.fill(0);

		expect(vector).toEqual(new Float32Array([0.5, -2]));
	});

	it('passes empty values through and reads invalid bytes as no vector', () => {
		expect(float32VectorTransformer.to(null)).toBeNull();
		expect(float32VectorTransformer.to(undefined)).toBeUndefined();
		expect(float32VectorTransformer.from(null)).toBeNull();
		expect(float32VectorTransformer.from(Buffer.from([1, 2, 3]))).toBeNull();
	});
});
