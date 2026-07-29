export async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	worker: (item: T) => Promise<R>,
): Promise<R[]> {
	if (!Number.isInteger(concurrency) || concurrency < 1) {
		throw new Error('Concurrency must be a positive integer');
	}

	const results = new Array<R>(items.length);
	let nextIndex = 0;
	const runWorker = async () => {
		while (nextIndex < items.length) {
			const index = nextIndex++;
			results[index] = await worker(items[index]);
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, async () => await runWorker()),
	);
	return results;
}
