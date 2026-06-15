import type * as fflate from 'fflate';
import { ensureError, UserError } from 'n8n-workflow';

import type { ZipOutputAccumulator } from './ZipOutputAccumulator';

/** Wires an fflate `UnzipFile` to a chunk writer and manages its decompression lifecycle. */
export class ZipEntryDecompressor {
	private isFinished = false;

	constructor(
		private readonly entry: fflate.UnzipFile,
		private readonly writeChunk: (chunk: Uint8Array) => void,
		private readonly accumulator: ZipOutputAccumulator,
		private readonly callbacks: {
			isSettled: () => boolean;
			onFinish: () => void;
			onError: (error: Error) => void;
		},
	) {}

	start(): void {
		this.entry.ondata = (error, chunk, final) => {
			if (this.callbacks.isSettled()) {
				this.entry.terminate();
				return;
			}
			if (error) {
				this.reject(error);
				return;
			}

			this.writeChunk(chunk);

			if (this.accumulator.isLimitExceeded) {
				this.reject(this.accumulator.exceededError);
				return;
			}

			if (final) this.finish();
		};

		try {
			this.entry.start();
		} catch (error) {
			this.reject(error);
		}
	}

	private finish(): void {
		if (this.isFinished) return;
		this.isFinished = true;
		this.callbacks.onFinish();
	}

	private reject(error: unknown): void {
		this.entry.terminate();

		if (error instanceof UserError) {
			this.callbacks.onError(error);
			return;
		}

		const cause = ensureError(error);
		this.callbacks.onError(
			new UserError(
				`ZIP entry "${this.entry.name}" couldn't be decompressed. Check the archive and try again. Original error: ${cause.message}`,
				{ cause },
			),
		);
	}
}
