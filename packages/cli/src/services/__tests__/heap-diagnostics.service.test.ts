import { BadRequestError, NotFoundError } from '@n8n/errors';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { HeapDiagnosticsService } from '@/services/heap-diagnostics.service';

const { writeHeapSnapshot } = vi.hoisted(() => ({ writeHeapSnapshot: vi.fn<() => string>() }));
vi.mock('node:v8', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:v8')>()),
	writeHeapSnapshot,
}));

describe('HeapDiagnosticsService', () => {
	const originalGc = global.gc;
	let dir: string;
	let service: HeapDiagnosticsService;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'heap-diagnostics-'));
		service = new HeapDiagnosticsService();
	});

	afterEach(() => {
		global.gc = originalGc;
		rmSync(dir, { recursive: true, force: true });
	});

	describe('collectGarbage', () => {
		it('should report failure when gc is not exposed', () => {
			global.gc = undefined;

			expect(service.collectGarbage()).toMatchObject({ success: false });
		});

		it('should run gc twice when gc is exposed', () => {
			const gc = vi.fn();
			global.gc = gc as unknown as typeof global.gc;

			expect(service.collectGarbage()).toMatchObject({ success: true });
			expect(gc).toHaveBeenCalledTimes(2);
		});
	});

	describe('writeHeapSnapshot', () => {
		it('should run gc first and return the snapshot file name and size', () => {
			const gc = vi.fn();
			global.gc = gc as unknown as typeof global.gc;
			const filePath = join(dir, 'Heap.1.heapsnapshot');
			writeHeapSnapshot.mockImplementation(() => {
				writeFileSync(filePath, 'x'.repeat(2048));
				return filePath;
			});

			const result = service.writeHeapSnapshot();

			expect(gc).toHaveBeenCalled();
			expect(result).toEqual({
				success: true,
				filePath: 'Heap.1.heapsnapshot',
				sizeBytes: 2048,
				sizeMB: 0,
			});
		});

		it('should report failure when V8 returns no file path', () => {
			writeHeapSnapshot.mockReturnValue('');

			expect(service.writeHeapSnapshot()).toMatchObject({ success: false });
		});
	});

	describe('openHeapSnapshot', () => {
		it('should open a snapshot this process wrote', async () => {
			const filePath = join(dir, 'Heap.2.heapsnapshot');
			writeHeapSnapshot.mockImplementation(() => {
				writeFileSync(filePath, 'snapshot');
				return filePath;
			});
			service.writeHeapSnapshot();

			const chunks: Buffer[] = [];
			for await (const chunk of service.openHeapSnapshot('Heap.2.heapsnapshot')) {
				chunks.push(chunk as Buffer);
			}

			expect(Buffer.concat(chunks).toString()).toBe('snapshot');
		});

		it('should reject files that are not heap snapshots', () => {
			expect(() => service.openHeapSnapshot('config.json')).toThrow(BadRequestError);
		});

		it('should resolve only the base name of the requested file', () => {
			const open = () => service.openHeapSnapshot('../../secret/missing.heapsnapshot');

			expect(open).toThrow(NotFoundError);
			expect(open).toThrow('Snapshot not found: missing.heapsnapshot');
		});
	});
});
