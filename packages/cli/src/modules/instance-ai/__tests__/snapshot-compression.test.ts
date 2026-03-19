import { compressSnapshot, decompressSnapshot } from '../storage/snapshot-compression';

describe('snapshot-compression', () => {
	const sampleSnapshot = {
		status: 'completed',
		result: {
			step1: {
				status: 'success',
				output: { data: 'some workflow output data' },
			},
			step2: {
				status: 'success',
				output: { items: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `item-${i}` })) },
			},
		},
		context: {
			workflowId: 'wf-123',
			executionId: 'exec-456',
			steps: ['step1', 'step2'],
		},
	};

	it('should round-trip compress and decompress', async () => {
		const compressed = await compressSnapshot(sampleSnapshot);
		const decompressed = await decompressSnapshot(compressed);

		expect(decompressed).toEqual(sampleSnapshot);
	});

	it('should produce valid gzip output (magic bytes 0x1f 0x8b)', async () => {
		const compressed = await compressSnapshot(sampleSnapshot);

		expect(compressed[0]).toBe(0x1f);
		expect(compressed[1]).toBe(0x8b);
	});

	it('should achieve meaningful size reduction', async () => {
		const json = JSON.stringify(sampleSnapshot);
		const compressed = await compressSnapshot(sampleSnapshot);

		expect(compressed.length).toBeLessThan(json.length * 0.8);
	});
});
