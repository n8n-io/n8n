import { float32VectorTransformer } from '../float32-vector';

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

	it('passes empty values through and reads invalid bytes as no vector', () => {
		expect(float32VectorTransformer.to(null)).toBeNull();
		expect(float32VectorTransformer.to(undefined)).toBeUndefined();
		expect(float32VectorTransformer.from(null)).toBeNull();
		expect(float32VectorTransformer.from(Buffer.from([1, 2, 3]))).toBeNull();
	});
});
