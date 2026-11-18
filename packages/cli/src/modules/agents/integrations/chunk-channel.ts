/**
 * A push-based async generator. A producer calls `push` for each chunk and
 * `close` when it is done. The consumer reads `stream`. Chunks keep their order.
 * It lets a turn that pushes its chunks feed a consumer that pulls them.
 */
export function createChunkChannel<T>(): {
	push(chunk: T): void;
	close(): void;
	stream: AsyncGenerator<T>;
} {
	const buffer: T[] = [];
	let closed = false;
	let wake: (() => void) | undefined;

	const notify = () => {
		const resolve = wake;
		wake = undefined;
		resolve?.();
	};

	async function* read(): AsyncGenerator<T> {
		while (true) {
			const chunk = buffer.shift();
			if (chunk !== undefined) {
				yield chunk;
				continue;
			}
			if (closed) return;
			await new Promise<void>((resolve) => {
				wake = resolve;
			});
		}
	}

	return {
		push(chunk) {
			// A chunk after close has no reader.
			if (closed) return;
			buffer.push(chunk);
			notify();
		},
		close() {
			closed = true;
			notify();
		},
		stream: read(),
	};
}
