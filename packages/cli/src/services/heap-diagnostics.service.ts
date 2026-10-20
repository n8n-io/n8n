import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { createReadStream, existsSync, statSync, type ReadStream } from 'node:fs';
import { basename, resolve } from 'node:path';
import { writeHeapSnapshot } from 'node:v8';

export type GarbageCollectionResult = { success: boolean; message: string };

export type HeapSnapshotResult =
	| { success: true; filePath: string; sizeBytes: number; sizeMB: number }
	| { success: false; message: string };

/**
 * Garbage collection and V8 heap snapshots for E2E and soak tests. Shared by
 * the main E2E controller and the worker and webhook servers.
 */
@Service()
export class HeapDiagnosticsService {
	/** Snapshot file name to its full path, so downloads resolve only files this process wrote. */
	private readonly snapshotPaths = new Map<string, string>();

	/** Needs `--expose-gc`. Runs twice so that objects freed by the first pass are also collected. */
	collectGarbage(): GarbageCollectionResult {
		if (typeof global.gc !== 'function') {
			return {
				success: false,
				message:
					'Garbage collection not available. Ensure Node.js is started with --expose-gc flag.',
			};
		}
		global.gc();
		global.gc();
		return { success: true, message: 'Garbage collection triggered' };
	}

	/**
	 * Runs GC, then writes a heap snapshot to the working directory. Blocks the
	 * event loop and needs about twice the heap size in memory while it writes.
	 */
	writeHeapSnapshot(): HeapSnapshotResult {
		this.collectGarbage();

		const filePath = writeHeapSnapshot();
		if (!filePath) return { success: false, message: 'Failed to write heap snapshot' };

		const fullPath = resolve(filePath);
		const filename = basename(fullPath);
		const { size } = statSync(fullPath);
		this.snapshotPaths.set(filename, fullPath);

		return {
			success: true,
			filePath: filename,
			sizeBytes: size,
			sizeMB: Math.round(size / 1024 / 1024),
		};
	}

	/**
	 * Opens a snapshot by file name. Falls back to the working directory so that
	 * snapshots written by `--heapsnapshot-signal` or `--heapsnapshot-near-heap-limit`
	 * can also be downloaded.
	 */
	openHeapSnapshot(requestedFilename: string): ReadStream {
		const filename = basename(requestedFilename);
		if (!filename.endsWith('.heapsnapshot')) throw new BadRequestError('Invalid file type');

		const fullPath = this.snapshotPaths.get(filename) ?? resolve(filename);
		if (!existsSync(fullPath)) throw new NotFoundError(`Snapshot not found: ${filename}`);

		return createReadStream(fullPath);
	}
}
