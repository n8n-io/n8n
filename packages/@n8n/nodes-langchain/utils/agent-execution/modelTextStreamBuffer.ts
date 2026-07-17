type RunId = string | undefined;

/** Buffers text until a model turn ends so tool-call preambles can be discarded. */
export class ModelTextStreamBuffer {
	private readonly chunksByRunId = new Map<RunId, string[]>();

	constructor(private readonly emit: (chunk: string) => void) {}

	append(runId: RunId, chunk: string): void {
		const chunks = this.chunksByRunId.get(runId) ?? [];
		chunks.push(chunk);
		this.chunksByRunId.set(runId, chunks);
	}

	complete(runId: RunId, shouldEmit: boolean): void {
		const chunks = this.chunksByRunId.get(runId) ?? [];
		this.chunksByRunId.delete(runId);

		if (shouldEmit) {
			for (const chunk of chunks) this.emit(chunk);
		}
	}

	flushPending(): void {
		for (const chunks of this.chunksByRunId.values()) {
			for (const chunk of chunks) this.emit(chunk);
		}
		this.chunksByRunId.clear();
	}
}
