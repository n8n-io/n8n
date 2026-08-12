/** Long enough to reassemble a chunked line, short enough to feel live. */
const DEFAULT_FLUSH_DELAY_MS = 50;

/** A tail this long without a newline is a stream that will not produce one. */
const DEFAULT_MAX_PENDING_CHARS = 64 * 1024;

export type LineAssemblerOptions = {
	onLine: (line: string) => void;
	flushDelayMs?: number;
	maxPendingChars?: number;
};

/**
 * Turns arbitrary `process.stdout.write` chunks into whole lines.
 *
 * Writes are not line-aligned: one `console.log` can arrive as several chunks,
 * and several can arrive as one. A partial tail is held back briefly in case
 * its remainder is coming, then flushed on a timer so a prompt-style write with
 * no trailing newline still reaches the console instead of hanging forever.
 */
export class LineAssembler {
	private pending = '';

	private timer?: NodeJS.Timeout;

	private readonly onLine: (line: string) => void;

	private readonly flushDelayMs: number;

	private readonly maxPendingChars: number;

	constructor({ onLine, flushDelayMs, maxPendingChars }: LineAssemblerOptions) {
		this.onLine = onLine;
		this.flushDelayMs = flushDelayMs ?? DEFAULT_FLUSH_DELAY_MS;
		this.maxPendingChars = maxPendingChars ?? DEFAULT_MAX_PENDING_CHARS;
	}

	push(chunk: string): void {
		if (chunk === '') return;

		this.pending += chunk;

		let newlineAt = this.pending.indexOf('\n');
		while (newlineAt !== -1) {
			this.emit(this.pending.slice(0, newlineAt));
			this.pending = this.pending.slice(newlineAt + 1);
			newlineAt = this.pending.indexOf('\n');
		}

		if (this.pending.length >= this.maxPendingChars) {
			this.flush();
			return;
		}

		if (this.pending === '') this.cancelTimer();
		else this.scheduleFlush();
	}

	/** Emit whatever partial line is held, if any. */
	flush(): void {
		this.cancelTimer();

		if (this.pending === '') return;

		const tail = this.pending;
		this.pending = '';
		this.emit(tail);
	}

	dispose(): void {
		this.flush();
	}

	private scheduleFlush(): void {
		if (this.timer !== undefined) return;

		this.timer = setTimeout(() => {
			this.timer = undefined;
			this.flush();
		}, this.flushDelayMs);

		// Capture must never be the reason a process stays alive.
		this.timer.unref();
	}

	private cancelTimer(): void {
		if (this.timer === undefined) return;
		clearTimeout(this.timer);
		this.timer = undefined;
	}

	/** Blank lines are spacing, not content — they only add noise to a tail. */
	private emit(rawLine: string): void {
		const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
		if (line === '') return;
		this.onLine(line);
	}
}
