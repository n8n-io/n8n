export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
	let inFlight: Promise<T> | null = null;

	return async () => {
		inFlight ??= fn().finally(() => {
			inFlight = null;
		});

		return await inFlight;
	};
}
