import { compressPayload, decompressPayload } from '../compression';

describe('Execution Data Compression Helpers', () => {
	it('should compress and decompress data correctly', () => {
		const original = '{"foo":"bar","baz":[1,2,3]}';
		const compressed = compressPayload(original);
		expect(compressed).toMatch(/^gzip:base64:/);

		const decompressed = decompressPayload(compressed);
		expect(decompressed).toBe(original);
	});

	it('should fall back to raw input if decompression prefix is not found', () => {
		const raw = '{"hello":"world"}';
		const result = decompressPayload(raw);
		expect(result).toBe(raw);
	});

	it('should handle null or undefined payloads', () => {
		expect(compressPayload(null)).toBeNull();
		expect(compressPayload(undefined)).toBeUndefined();
		expect(decompressPayload(null)).toBeNull();
		expect(decompressPayload(undefined)).toBeUndefined();
	});
});
